import crypto from 'crypto'
import { existsSync } from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

function resolveWorkerUrl(): URL {
	const candidates = ['./analyzerWorker.mjs', './analyzerWorker.test.mjs']
	for (const candidate of candidates) {
		const url = new URL(candidate, import.meta.url)
		if (existsSync(fileURLToPath(url))) {
			return url
		}
	}
	throw new Error(
		'analyzerWorker.mjs not found. Run yarn build, or run tests via yarn test (which compiles the worker first).',
	)
}
import { SourceFile, SyntaxKind } from 'ts-morph'
import { Project } from 'ts-morph'

import { Logger } from '../../utils/logger'
import { discoverImportedName } from '../discoveryModule/discoverImports/discoverImports'
import {
	DiscoveredSourceFile,
	discoverRouterFiles,
} from '../discoveryModule/discoverRouterFiles/discoverRouterFiles'
import { discoverRouters } from '../discoveryModule/discoverRouters/discoverRouters'
import { ApiDocsHeader, OpenApiManager } from '../manager/OpenApiManager'
import { EndpointData, ExposedModelData } from '../types'
import { getSourceFileTimestamp, MtimeCache, TimestampCache } from './getSourceFileTimestamp'
import { getValuesOfObjectLiteral, resolveEndpointPath } from './nodeParsers'
import { parseEndpoint, SectionTiming } from './parseEndpoint'
import { parseExposedModel, parseNamedExposedModels } from './parseExposedModels'
import { SourceFileCache } from './sourceFileCache'
import { WorkerPool, WorkerResult, WorkerTask } from './workerPool'

type Props = {
	logLevel?: Parameters<(typeof Logger)['setLevel']>[0]
	tsconfigPath: string
	sourceFilePaths?: string[]
	sourceFileDiscovery?: boolean | FileDiscoveryConfig
	incremental?:
		| boolean
		| {
				cachePath: string
		  }
	profiling?: 'stats' | 'off' | 'debug'
}

type FileDiscoveryConfig = {
	rootPath: string
}

type EndpointTiming = { method: string; path: string; timing: number; sectionTimings: SectionTiming[] }

/**
 * Number of uncached files at or below which analysis runs inline on the (already-warm) main-thread
 * Project instead of fanning out to worker threads. Each worker pays a multi-second cold-start to
 * build its own Project, so parallelism only wins once there are several files to share that cost.
 */
const INLINE_ANALYSIS_FILE_THRESHOLD = 2

/**
 * @param tsconfigPath Path to tsconfig file relative to project root
 * @param sourceFilePaths Array of router source files relative to project root
 */
export const prepareOpenApiSpec = async ({
	logLevel,
	tsconfigPath,
	sourceFilePaths,
	sourceFileDiscovery,
	incremental,
	profiling = 'stats',
}: Props): Promise<void> => {
	const openApiManager = OpenApiManager.getInstance()

	if (openApiManager.isReady()) {
		return
	}

	if (logLevel) {
		Logger.setLevel(logLevel)
	}

	Logger.info('Preparing OpenAPI spec')

	const project = new Project({
		tsConfigFilePath: path.resolve(tsconfigPath),
		skipFileDependencyResolution: true,
	})

	const { explicitRouters, discoveredRouterFiles, allSourceFiles } = (() => {
		const sourceFilesToAdd = sourceFilePaths ?? []
		const resolvedSourceFilePaths = sourceFilesToAdd.map((filepath) => path.resolve(filepath))
		const sourceFiles = resolvedSourceFilePaths.map((filePath) => project.getSourceFileOrThrow(filePath))
		const explicitRouters = sourceFiles.flatMap((file) => ({
			fileName: file.getFilePath(),
			sourceFile: file,
			routers: discoverRouters(file),
		}))

		const { discoveredRouterFiles, discoveredSourceFiles } = (() => {
			if (sourceFileDiscovery === false) {
				return { discoveredRouterFiles: [], discoveredSourceFiles: [] }
			}

			const startTime = performance.now()
			const files = discoverRouterFiles({
				targetPath: typeof sourceFileDiscovery === 'object' ? sourceFileDiscovery.rootPath : '.',
				tsConfigPath: tsconfigPath,
			})
			if (profiling !== 'off') {
				Logger.info(`File discovery took ${Math.round(performance.now() - startTime)}ms`)
			}
			return files
		})()

		const allSourceFiles = sourceFiles.reduce(
			(acc, current) =>
				acc.some((r) => r.getFilePath() === current.getFilePath()) ? acc : acc.concat(current),
			discoveredSourceFiles,
		)

		return { explicitRouters, discoveredRouterFiles, allSourceFiles }
	})()

	const filesToAnalyze = explicitRouters.reduce(
		(acc, current) => (acc.some((r) => r.fileName === current.fileName) ? acc : acc.concat(current)),
		discoveredRouterFiles,
	)

	const apiHeaders = allSourceFiles
		.flatMap((file) => analyzeSourceFileApiHeader(file))
		.filter((headers) => !!headers)
	if (apiHeaders.length > 0 && apiHeaders[0]) {
		openApiManager.setHeader(apiHeaders[0])
	}

	const exposedModels = allSourceFiles.flatMap((file) => analyzeSourceFileExposedModels(file))

	openApiManager.setExposedModels(exposedModels)

	const cachePath = (() => {
		if (typeof incremental === 'object' && incremental.cachePath) {
			return incremental.cachePath
		}
		return path.resolve(process.cwd(), 'node_modules', '.cache', 'moonflower')
	})()
	const endpoints = await analyzeMultipleSourceFiles(filesToAnalyze, {
		incremental: incremental !== false,
		cachePath,
		timestampCache: {},
		profiling,
		tsconfigPath: path.resolve(tsconfigPath),
	})

	openApiManager.setStats({
		discoveredRouterFiles: discoveredRouterFiles.map((file) => ({
			path: file.fileName,
			routers: file.routers.named.map((r) => ({
				name: r,
				endpoints: endpoints
					.filter((e) => e.sourceFilePath === file.fileName)
					.map((e) => `${e.method.toUpperCase()} ${e.path}`),
			})),
		})),
		explicitRouterFiles: explicitRouters.map((file) => ({
			path: file.fileName,
			routers: file.routers.named.map((r) => ({
				name: r,
				endpoints: endpoints
					.filter((e) => e.sourceFilePath === file.fileName)
					.map((e) => `${e.method.toUpperCase()} ${e.path}`),
			})),
		})),
	})

	openApiManager.setEndpoints(endpoints)
	openApiManager.markAsReady()
}

export const analyzeMultipleSourceFiles = async (
	files: DiscoveredSourceFile[],
	config: {
		incremental: boolean
		cachePath: string
		timestampCache: TimestampCache
		profiling?: 'stats' | 'off' | 'debug'
		tsconfigPath: string
	},
	filterEndpointPaths?: string[],
): Promise<EndpointData[]> => {
	const profiling = config.profiling ?? 'stats'
	const startTime = performance.now()

	// Separate cached files from those needing analysis
	type CachedFile = { endpoints: EndpointData[]; fileName: string; timing: 0; endpointTimings: [] }
	type UncachedFile = { file: DiscoveredSourceFile; timestamp: number }

	const cached: CachedFile[] = []
	const uncached: UncachedFile[] = []

	const freshnessCheckStart = performance.now()
	const mtimeCache: MtimeCache = new Map()
	for (const file of files) {
		const timestamp = getSourceFileTimestamp(file.sourceFile, config.timestampCache, mtimeCache)
		const hit = config.incremental
			? SourceFileCache.getCachedResults(file.sourceFile, timestamp, config.cachePath)
			: null
		if (hit) {
			Logger.debug(`[${file.fileName}] Found cached results`)
			cached.push({ endpoints: hit.endpoints, fileName: file.fileName, timing: 0, endpointTimings: [] })
		} else {
			uncached.push({ file, timestamp })
		}
	}
	if (profiling !== 'off') {
		Logger.info(`Cache freshness check took ${Math.round(performance.now() - freshnessCheckStart)}ms`)
	}

	if (uncached.length === 0) {
		if (profiling !== 'off') {
			Logger.info(`Router analysis took ${Math.round(performance.now() - startTime)}ms`)
		}
		return cached.flatMap((f) => f.endpoints)
	}

	type FileResult = {
		endpoints: EndpointData[]
		fileName: string
		timing: number
		endpointTimings: EndpointTiming[]
	}

	const byFile = new Map<string, FileResult>()
	for (const { file } of uncached) {
		byFile.set(file.fileName, { endpoints: [], fileName: file.fileName, timing: 0, endpointTimings: [] })
	}

	// The caller (prepareOpenApiSpec) already built and warmed a ts-morph Project on this thread, so
	// inline analysis runs against a hot type-checker. A worker, by contrast, must spawn a thread and
	// build its own Project from scratch — a multi-second cold-start. That cold-start only pays off
	// when there are enough uncached files that spreading the parse work across workers beats it; below
	// the threshold (e.g. the common single-file incremental rebuild), inline is strictly faster.
	if (uncached.length <= INLINE_ANALYSIS_FILE_THRESHOLD) {
		for (const { file } of uncached) {
			const { endpoints, endpointTimings } = analyzeSourceFileEndpoints(file, filterEndpointPaths)
			const fileResult = byFile.get(file.fileName)!
			fileResult.endpoints = endpoints
			fileResult.endpointTimings = endpointTimings
			fileResult.timing = endpointTimings.reduce((sum, t) => sum + t.timing, 0)
		}
	} else {
		// One task per file: each worker analyzes a whole file in a single pass, paying its Project
		// cold-start once and reusing the warmed-up checker for every endpoint in that file. Cap the
		// pool at one worker per file so we never spin up a worker with nothing to do.
		type FileTask = { task: WorkerTask; fileName: string }
		const allTasks: FileTask[] = uncached.map(({ file }) => ({
			fileName: file.fileName,
			task: {
				taskId: crypto.randomUUID(),
				tsconfigPath: config.tsconfigPath,
				sourceFilePath: file.sourceFile.getFilePath(),
				routerNames: file.routers.named,
				filterEndpointPaths,
			},
		}))

		const pool = new WorkerPool(resolveWorkerUrl(), allTasks.length)
		let results: WorkerResult[]
		try {
			results = await pool.runAll(allTasks.map((ft) => ft.task))
		} finally {
			pool.terminate()
		}

		// Each result maps 1:1 to a file task.
		for (let i = 0; i < results.length; i++) {
			const result = results[i]
			const fileName = allTasks[i].fileName
			const fileResult = byFile.get(fileName)!

			if ('error' in result) {
				Logger.error(`[${fileName}] Worker error: ${result.error}`)
				continue
			}

			fileResult.endpoints = result.endpoints
			fileResult.endpointTimings = result.endpointTimings
			fileResult.timing = result.endpointTimings.reduce((sum, t) => sum + t.timing, 0)
		}
	}

	// Write cache for each uncached file
	for (const { file, timestamp } of uncached) {
		const fileResult = byFile.get(file.fileName)!
		if (fileResult.endpoints.length > 0) {
			SourceFileCache.cacheResults(file.sourceFile, timestamp, config.cachePath, fileResult.endpoints)
		}
	}

	const analyzedFiles = [...cached, ...Array.from(byFile.values())]

	if (profiling !== 'off') {
		Logger.info(`Router analysis took ${Math.round(performance.now() - startTime)}ms`)
	}

	if (profiling === 'stats') {
		analyzedFiles
			.map((f) => ({ fileName: f.fileName, timeTaken: f.timing }))
			.sort((a, b) => b.timeTaken - a.timeTaken)
			.filter((t) => t.timeTaken > 500)
			.forEach((t) => {
				Logger.info(`- [${t.fileName}] Took ${Math.round(t.timeTaken)}ms to analyze`)
			})
	} else if (profiling === 'debug') {
		analyzedFiles
			.map((f) => ({ fileName: f.fileName, timeTaken: f.timing, endpointTimings: f.endpointTimings }))
			.sort((a, b) => b.timeTaken - a.timeTaken)
			.forEach((t) => {
				Logger.info(`- [${t.fileName}] Took ${Math.round(t.timeTaken)}ms to analyze`)
				t.endpointTimings
					.sort((a, b) => b.timing - a.timing)
					.forEach((ep) => {
						Logger.info(`  - ${ep.method} ${ep.path} (${Math.round(ep.timing)}ms)`)
						ep.sectionTimings
							.filter((s) => s.timing >= 1)
							.sort((a, b) => b.timing - a.timing)
							.forEach((s) => {
								Logger.info(`    - ${s.section}: ${Math.round(s.timing)}ms`)
							})
					})
			})
	}

	return analyzedFiles.flatMap((f) => f.endpoints)
}

export const analyzeSourceFileWithCache = (
	file: DiscoveredSourceFile,
	config: {
		incremental: boolean
		cachePath: string
		timestampCache: TimestampCache
		profiling?: 'stats' | 'off' | 'debug'
	},
	filterEndpointPaths?: string[],
): { endpoints: EndpointData[]; timing: number; endpointTimings: EndpointTiming[] } => {
	const timestamp = getSourceFileTimestamp(file.sourceFile, config.timestampCache)
	const cachedResults = SourceFileCache.getCachedResults(file.sourceFile, timestamp, config.cachePath)

	if (cachedResults) {
		Logger.debug(`[${file.fileName}] Found cached results`)
		return { endpoints: cachedResults.endpoints, timing: 0, endpointTimings: [] }
	}
	Logger.debug(`[${file.fileName}] Analyzing...`)

	const t1 = performance.now()
	const { endpoints, endpointTimings } = analyzeSourceFileEndpoints(file, filterEndpointPaths)
	const t2 = performance.now()
	Logger.debug(`[${file.fileName}] Analyzed in ${t2 - t1}ms`)
	SourceFileCache.cacheResults(file.sourceFile, timestamp, config.cachePath, endpoints)
	return { endpoints, timing: t2 - t1, endpointTimings }
}

export const analyzeSourceFileEndpoints = (
	file: DiscoveredSourceFile,
	filterEndpointPaths?: string[],
): { endpoints: EndpointData[]; endpointTimings: EndpointTiming[] } => {
	const endpoints: EndpointData[] = []
	const endpointTimings: EndpointTiming[] = []
	const operations = ['get', 'post', 'put', 'delete', 'del', 'patch']
	const joinedOperations = operations.join('|')

	file.routers.named.forEach((routerName) => {
		const routerPattern = new RegExp(`${routerName}\\.(?:${joinedOperations})`)
		file.sourceFile.forEachChild((node) => {
			const nodeText = node.getText()

			if (routerPattern.test(nodeText)) {
				const endpointPath = resolveEndpointPath(node) ?? ''

				if (filterEndpointPaths && !filterEndpointPaths.some((path) => endpointPath.includes(path))) {
					return
				}

				const t1 = performance.now()
				const { endpoint, sectionTimings } = parseEndpoint(node, file.fileName)
				endpointTimings.push({
					method: endpoint.method,
					path: endpoint.path,
					timing: performance.now() - t1,
					sectionTimings,
				})
				endpoints.push(endpoint)
			}
		})
	})

	return { endpoints, endpointTimings }
}

export const analyzeSourceFileApiHeader = (sourceFile: SourceFile): ApiDocsHeader | null => {
	const nameOfUseApiHeader = discoverImportedName({
		sourceFile,
		originalName: 'useApiHeader',
	})

	if (!nameOfUseApiHeader) {
		return null
	}

	const node = sourceFile
		.forEachChildAsArray()
		.filter((node) => node.isKind(SyntaxKind.ExpressionStatement))
		.find((node) => nameOfUseApiHeader && node.getText().startsWith(nameOfUseApiHeader))

	if (!node) {
		return null
	}

	const targetNode = node.getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression)
	const values = getValuesOfObjectLiteral(targetNode)

	const collapseObject = (v: string | string[] | typeof values): any => {
		if (typeof v === 'string') {
			return v
		}
		if (Array.isArray(v) && v.every((value) => typeof value === 'string')) {
			return v
		}

		return v.reduce((acc, current) => {
			if (typeof current === 'string') {
				return acc
			}
			return {
				...acc,
				[current.identifier]: collapseObject(current.value as string[]),
			}
		}, {})
	}
	return collapseObject(values)
}

export const analyzeSourceFileExposedModels = (sourceFile: SourceFile): ExposedModelData[] => {
	const models: ExposedModelData[] = []

	const nameOfUseExposeApiModel = discoverImportedName({
		sourceFile,
		originalName: 'useExposeApiModel',
	})

	const nameOfUseExposeNamedApiModels = discoverImportedName({
		sourceFile,
		originalName: 'useExposeNamedApiModels',
	})

	sourceFile
		.forEachChildAsArray()
		.filter((node) => node.isKind(SyntaxKind.ExpressionStatement))
		.map((node) => {
			if (nameOfUseExposeApiModel && node.getText().startsWith(nameOfUseExposeApiModel)) {
				const callExpressionNode = node.getFirstChild()
				const syntaxListChildren = callExpressionNode?.getChildrenOfKind(SyntaxKind.SyntaxList) || []

				const firstChild = syntaxListChildren[0].getFirstChild()
				if (!firstChild) {
					return
				}

				models.push(parseExposedModel(firstChild))
				return
			}

			if (nameOfUseExposeNamedApiModels && node.getText().startsWith(nameOfUseExposeNamedApiModels)) {
				const callExpressionNode = node.getFirstChild()
				const syntaxListChildren = callExpressionNode?.getChildrenOfKind(SyntaxKind.SyntaxList) || []

				const firstChild = syntaxListChildren[0].getFirstChild()
				if (!firstChild) {
					return
				}

				const parsedModels = parseNamedExposedModels(firstChild)
				parsedModels.forEach((model) => models.push(model))
			}
		})
	return models
}
