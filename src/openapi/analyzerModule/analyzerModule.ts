import * as path from 'path'
import { SourceFile, SyntaxKind } from 'ts-morph'
import { Project } from 'ts-morph'

import {
	DiscoveredSourceFile,
	discoverRouterFiles,
} from '../discoveryModule/discoverRouterFiles/discoverRouterFiles'
import { discoverRouters } from '../discoveryModule/discoverRouters/discoverRouters'
import { OpenApiManager } from '../manager/OpenApiManager'
import { EndpointData, ExposedModelData } from '../types'
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

	const filesToAnalyze = (() => {
		const sourceFilesToAdd = sourceFilePaths ?? []
		const resolvedSourceFilePaths = sourceFilesToAdd.map((filepath) => path.resolve(filepath))
		const sourceFiles = resolvedSourceFilePaths.map((filePath) => project.getSourceFileOrThrow(filePath))
		const manuallyAddedRouters = sourceFiles.flatMap((file) => ({
			fileName: file.getFilePath(),
			sourceFile: file,
			routers: discoverRouters(file),
		}))

		const discoveredRouters = (() => {
			if (sourceFileDiscovery === false) {
				return []
			}

			return discoverRouterFiles({
				targetPath: typeof sourceFileDiscovery === 'object' ? sourceFileDiscovery.rootPath : '.',
				tsConfigPath: tsconfigPath,
			})
		})()

		return manuallyAddedRouters.reduce(
			(acc, current) => (acc.some((r) => r.fileName === current.fileName) ? acc : acc.concat(current)),
			discoveredRouters
		)
	})()

	const exposedModels = filesToAnalyze.flatMap((file) => analyzeSourceFileExposedModels(file.sourceFile))

	openApiManager.setExposedModels(exposedModels)

	const endpoints = filesToAnalyze.flatMap((file) => analyzeSourceFileEndpoints(file))

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

				endpoints.push(parseEndpoint(node))
			}
		})
	})
	return endpoints
}

export const analyzeSourceFileExposedModels = (sourceFile: SourceFile): ExposedModelData[] => {
	const models: ExposedModelData[] = []

	sourceFile
		.forEachChildAsArray()
		.filter((node) => node.isKind(SyntaxKind.ExpressionStatement))
		.map((node) => {
			if (node.getText().startsWith('useExposeApiModel')) {
				const callExpressionNode = node.getFirstChild()
				const syntaxListChildren = callExpressionNode?.getChildrenOfKind(SyntaxKind.SyntaxList) || []
				if (syntaxListChildren.length < 2) {
					console.error('Missing type argument in useExposeApiModel')
					return
				}

				const firstChild = syntaxListChildren[0].getFirstChild()
				if (!firstChild) {
					return
				}

				models.push(parseExposedModel(firstChild))
				return
			}

			if (node.getText().startsWith('useExposeNamedApiModels')) {
				const callExpressionNode = node.getFirstChild()
				const syntaxListChildren = callExpressionNode?.getChildrenOfKind(SyntaxKind.SyntaxList) || []
				if (syntaxListChildren.length < 2) {
					console.error('Missing type argument in useExposeApiModel')
					return
				}

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
