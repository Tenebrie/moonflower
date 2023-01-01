import * as path from 'path'
import { SourceFile, SyntaxKind } from 'ts-morph'
import { Project } from 'ts-morph'

import { OpenApiManager } from '../manager/OpenApiManager'
import { EndpointData } from '../types'
import { parseEndpoint } from './parseEndpoint'

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
	const endpoints = sourceFiles.flatMap((sourceFile) => analyzeSourceFile(sourceFile))

	openApiManager.initialize(endpoints)
}

export const analyzeSourceFile = (sourceFile: SourceFile, filterEndpointPaths?: string[]): EndpointData[] => {
	const endpoints: EndpointData[] = []

	sourceFile.forEachChild((node) => {
		if (node.getText().includes('router.get') || node.getText().includes('router.post')) {
			const endpointText = node.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getText() ?? ''
			const endpointPath = endpointText.substring(1, endpointText.length - 1)
			if (!!filterEndpointPaths && !filterEndpointPaths.some((path) => endpointPath.includes(path))) {
				return
			}

			const result = parseEndpoint(node)
			endpoints.push(result)
		}
	})
	return endpoints
}
