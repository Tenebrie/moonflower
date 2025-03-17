import * as path from 'path'
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
import { getSourceFileTimestamp, TimestampCache } from './getSourceFileTimestamp'
import { getValuesOfObjectLiteral } from './nodeParsers'
import { parseEndpoint } from './parseEndpoint'
import { parseExposedModel, parseNamedExposedModels } from './parseExposedModels'
import { SourceFileCache } from './sourceFileCache'

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
}

type FileDiscoveryConfig = {
	rootPath: string
}

/**
 * @param tsconfigPath Path to tsconfig file relative to project root
 * @param sourceFilePaths Array of router source files relative to project root
 */
export const prepareOpenApiSpec = ({
	logLevel,
	tsconfigPath,
	sourceFilePaths,
	sourceFileDiscovery,
	incremental,
}: Props) => {
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
			Logger.info(`File discovery took ${Math.round(performance.now() - startTime)}ms`)
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

	const startTime = performance.now()
	const cachePath = (() => {
		if (typeof incremental === 'object' && incremental.cachePath) {
			return incremental.cachePath
		}
		return path.resolve(process.cwd(), 'node_modules', '.cache', 'moonflower')
	})()
	const endpoints = analyzeMultipleSourceFiles(filesToAnalyze, {
		incremental: incremental !== false,
		cachePath,
		project,
		timestampCache: {},
	})
	Logger.info(`Router analysis took ${Math.round(performance.now() - startTime)}ms`)

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

export const analyzeMultipleSourceFiles = (
	files: DiscoveredSourceFile[],
	config: {
		incremental: boolean
		cachePath: string
		project: Project
		timestampCache: TimestampCache
	},
	filterEndpointPaths?: string[],
) => {
	return files.flatMap((file) => analyzeSourceFileWithCache(file, config, filterEndpointPaths))
}

export const analyzeSourceFileWithCache = (
	file: DiscoveredSourceFile,
	config: {
		incremental: boolean
		cachePath: string
		project: Project
		timestampCache: TimestampCache
	},
	filterEndpointPaths?: string[],
): EndpointData[] => {
	const timestamp = getSourceFileTimestamp(file.sourceFile, config.timestampCache)
	const cachedResults = SourceFileCache.getCachedResults(file.sourceFile, timestamp, config.cachePath)

	if (cachedResults) {
		Logger.debug(`[${file.fileName}] Found cached results`)
		return cachedResults.endpoints
	}
	Logger.debug(`[${file.fileName}] Analyzing...`)

	const t1 = performance.now()
	const endpoints = analyzeSourceFileEndpoints(file, filterEndpointPaths)
	const t2 = performance.now()
	Logger.info(`[${file.fileName}] Analyzed in ${t2 - t1}ms`)
	SourceFileCache.cacheResults(file.sourceFile, timestamp, config.cachePath, endpoints)
	return endpoints
}

export const analyzeSourceFileEndpoints = (
	file: DiscoveredSourceFile,
	filterEndpointPaths?: string[],
): EndpointData[] => {
	const endpoints: EndpointData[] = []
	const operations = ['get', 'post', 'put', 'delete', 'del', 'patch']
	const joinedOperations = operations.join('|')

	file.routers.named.forEach((routerName) => {
		file.sourceFile.forEachChild((node) => {
			const nodeText = node.getText()
			const routerPattern = new RegExp(`${routerName}\\.(?:${joinedOperations})`)

			if (routerPattern.test(nodeText)) {
				const endpointText = node.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getText() ?? ''
				const endpointPath = endpointText.slice(1, -1)

				if (filterEndpointPaths && !filterEndpointPaths.some((path) => endpointPath.includes(path))) {
					return
				}

				endpoints.push(parseEndpoint(node, file.fileName))
			}
		})
	})

	return endpoints
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
