import * as path from 'path'
import { Project } from 'ts-morph'

export const loadTestData = (filePath: string) => {
	const project = new Project({
		tsConfigFilePath: path.resolve('./tsconfig.json'),
		skipFileDependencyResolution: true,
	})

	const sourceFile = project.getSourceFile(filePath)
	if (!sourceFile) {
		throw new Error('Test data file not found')
	}

	return sourceFile
}
