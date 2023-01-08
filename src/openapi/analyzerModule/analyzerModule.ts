import * as path from 'path'
import { SourceFile, SyntaxKind } from 'ts-morph'
import { Project } from 'ts-morph'

import { OpenApiManager } from '../manager/OpenApiManager'
import { EndpointData, ExposedModelData } from '../types'
import { parseEndpoint } from './parseEndpoint'
import { parseExposedModel, parseNamedExposedModels } from './parseExposedModels'

/**
 * @param tsconfigPath Path to tsconfig file relative to project root
 * @param sourceFilePaths Array of router source files relative to project root
 */
export const prepareOpenApiSpec = (tsconfigPath: string, sourceFilePaths: string[]) => {
	const openApiManager = OpenApiManager.getInstance()

	if (openApiManager.isReady()) {
		return
	}

	const project = new Project({
		tsConfigFilePath: path.resolve(tsconfigPath),
	})
	const resolvedSourceFilePaths = sourceFilePaths.map((filepath) => path.resolve(filepath))

	const sourceFiles = resolvedSourceFilePaths.map((filePath) => project.getSourceFileOrThrow(filePath))
	const exposedModels = sourceFiles.flatMap((sourceFile) => analyzeSourceFileExposedModels(sourceFile))

	openApiManager.setExposedModels(exposedModels)

	const endpoints = sourceFiles.flatMap((sourceFile) => analyzeSourceFileEndpoints(sourceFile))

	openApiManager.setEndpoints(endpoints)
	openApiManager.markAsReady()
}

export const analyzeSourceFileEndpoints = (
	sourceFile: SourceFile,
	filterEndpointPaths?: string[]
): EndpointData[] => {
	const endpoints: EndpointData[] = []

	sourceFile.forEachChild((node) => {
		if (
			node.getText().includes('router.get') ||
			node.getText().includes('router.post') ||
			node.getText().includes('router.put') ||
			node.getText().includes('router.delete') ||
			node.getText().includes('router.del') ||
			node.getText().includes('router.patch')
		) {
			const endpointText = node.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getText() ?? ''
			const endpointPath = endpointText.substring(1, endpointText.length - 1)
			if (!!filterEndpointPaths && !filterEndpointPaths.some((path) => endpointPath.includes(path))) {
				return
			}

			endpoints.push(parseEndpoint(node))
		}
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
