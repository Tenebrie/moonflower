import * as path from 'path'
import { SourceFile, SyntaxKind } from 'ts-morph'
import { Project } from 'ts-morph'

import { discoverImportedName } from '../discoveryModule/discoverImports/discoverImports'
import {
	DiscoveredSourceFile,
	discoverRouterFiles,
} from '../discoveryModule/discoverRouterFiles/discoverRouterFiles'
import { discoverRouters } from '../discoveryModule/discoverRouters/discoverRouters'
import { ApiDocsHeader, OpenApiManager } from '../manager/OpenApiManager'
import { EndpointData, ExposedModelData } from '../types'
import { getValuesOfObjectLiteral } from './nodeParsers'
import { parseEndpoint } from './parseEndpoint'
import { parseExposedModel, parseNamedExposedModels } from './parseExposedModels'

type Props = {
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
	tsconfigPath,
	sourceFilePaths,
	sourceFileDiscovery,
	incremental,
}: Props) => {
	const openApiManager = OpenApiManager.getInstance()

	if (openApiManager.isReady()) {
		return
	}

	const project = new Project({
		tsConfigFilePath: path.resolve(tsconfigPath),
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

			const t1 = performance.now()
			const files = discoverRouterFiles({
				targetPath: typeof sourceFileDiscovery === 'object' ? sourceFileDiscovery.rootPath : '.',
				tsConfigPath: tsconfigPath,
			})
			const t2 = performance.now()
			console.log(`discoverRouterFiles took ${t2 - t1}ms`)
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

	// const t1 = performance.now()
	// const cachePath = (() => {
	// 	if (typeof incremental === 'object' && incremental.cachePath) {
	// 		return incremental.cachePath
	// 	}
	// 	return path.resolve(process.cwd(), 'node_modules', '.cache', 'moonflower')
	// })()
	// const endpoints = analyzeMultipleSourceFiles(filesToAnalyze, {
	// 	incremental: incremental !== false,
	// 	cachePath,
	// })
	// const t2 = performance.now()
	// console.log(`analyzeSourceFileEndpoints took ${t2 - t1}ms TOTAL`)

	const endpoints = filesToAnalyze.flatMap((file) => analyzeSourceFileEndpoints(file))

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
	},
	filterEndpointPaths?: string[],
): EndpointData[] => {
	return analyzeSourceFileEndpoints(file, filterEndpointPaths)
}

export const analyzeSourceFileEndpoints = (
	file: DiscoveredSourceFile,
	filterEndpointPaths?: string[],
): EndpointData[] => {
	const endpoints: EndpointData[] = []
	const operations = ['get', 'post', 'put', 'delete', 'del', 'patch']
	const joinedOperations = operations.join('|')
	const t1 = performance.now()

	file.routers.named.forEach((routerName) => {
		file.sourceFile.forEachChild((node) => {
			const nodeText = node.getText()
			// Create a single regex pattern for all operations
			const routerPattern = new RegExp(`${routerName}\\.(?:${joinedOperations})`)

			if (routerPattern.test(nodeText)) {
				const endpointText = node.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getText() ?? ''
				const endpointPath = endpointText.slice(1, -1)

				if (filterEndpointPaths && !filterEndpointPaths.some((path) => endpointPath.includes(path))) {
					return
				}

				const t3 = performance.now()
				endpoints.push(parseEndpoint(node, file.fileName))
				const t4 = performance.now()
				// console.log(`parseEndpoint took ${t4 - t3}ms`)
			}
		})
	})

	const t2 = performance.now()
	// console.log(`analyzeSourceFileEndpoints took ${t2 - t1}ms`)
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
