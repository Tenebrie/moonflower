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
}

type FileDiscoveryConfig = {
	rootPath: string
}

/**
 * @param tsconfigPath Path to tsconfig file relative to project root
 * @param sourceFilePaths Array of router source files relative to project root
 */
export const prepareOpenApiSpec = ({ tsconfigPath, sourceFilePaths, sourceFileDiscovery }: Props) => {
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

			return discoverRouterFiles({
				targetPath: typeof sourceFileDiscovery === 'object' ? sourceFileDiscovery.rootPath : '.',
				tsConfigPath: tsconfigPath,
			})
		})()

		const allSourceFiles = sourceFiles.reduce(
			(acc, current) =>
				acc.some((r) => r.getFilePath() === current.getFilePath()) ? acc : acc.concat(current),
			discoveredSourceFiles
		)

		return { explicitRouters, discoveredRouterFiles, allSourceFiles }
	})()

	const filesToAnalyze = explicitRouters.reduce(
		(acc, current) => (acc.some((r) => r.fileName === current.fileName) ? acc : acc.concat(current)),
		discoveredRouterFiles
	)

	const apiHeaders = allSourceFiles
		.flatMap((file) => analyzeSourceFileApiHeader(file))
		.filter((headers) => !!headers)
	if (apiHeaders.length > 0 && apiHeaders[0]) {
		openApiManager.setHeader(apiHeaders[0])
	}

	const exposedModels = allSourceFiles.flatMap((file) => analyzeSourceFileExposedModels(file))

	openApiManager.setExposedModels(exposedModels)

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

export const analyzeSourceFileEndpoints = (
	file: DiscoveredSourceFile,
	filterEndpointPaths?: string[]
): EndpointData[] => {
	const endpoints: EndpointData[] = []

	file.routers.named.forEach((routerName) => {
		file.sourceFile.forEachChild((node) => {
			const nodeText = node.getText()
			const operations = ['get', 'post', 'put', 'delete', 'del', 'patch']
			const targetNodes = operations.map((op) => `${routerName}.${op}`)

			if (targetNodes.some((targetNode) => nodeText.includes(targetNode))) {
				const endpointText = node.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getText() ?? ''
				const endpointPath = endpointText.substring(1, endpointText.length - 1)
				if (!!filterEndpointPaths && !filterEndpointPaths.some((path) => endpointPath.includes(path))) {
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
