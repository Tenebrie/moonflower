import * as path from 'path'
import { Project, SourceFile } from 'ts-morph'

import { analyzeSourceFileExposedModels } from '../../openapi/analyzerModule/analyzerModule'

describe('useExposeApiModel', () => {
	describe('when analyzing a test data file', () => {
		let dataFile: SourceFile
		let analysisResult: ReturnType<typeof analyzeSourceFileExposedModels>

		const analyzeModelByName = (name: string) => {
			if (!analysisResult) {
				analysisResult = analyzeSourceFileExposedModels(dataFile)
			}
			const exposedModel = analysisResult.find((model) => model.name === name)
			if (!exposedModel) {
				throw new Error(`No exposed model with name ${name} found!`)
			}
			return exposedModel
		}

		beforeAll(() => {
			const project = new Project({
				tsConfigFilePath: path.resolve('./tsconfig.json'),
			})

			const sourceFile = project.getSourceFile('useExposeApiModel.spec.data.ts')
			if (!sourceFile) {
				throw new Error('Where file?')
			}

			dataFile = sourceFile
		})

		it('parses single expose model correctly', () => {
			const model = analyzeModelByName('FooBarObject')

			expect(model.shape).toEqual([
				{
					role: 'property',
					identifier: 'foo',
					shape: 'string',
					optional: false,
				},
				{
					role: 'property',
					identifier: 'bar',
					shape: 'number',
					optional: false,
				},
				{
					role: 'property',
					identifier: 'baz',
					shape: 'boolean',
					optional: false,
				},
			])
		})

		it('parses named exposed models correctly', () => {
			const simpleStringModel = analyzeModelByName('SimpleString')
			const simpleNumberModel = analyzeModelByName('SimpleNumber')
			const numberBaseModel = analyzeModelByName('NumberBase')

			expect(simpleStringModel.shape).toEqual('string')
			expect(simpleNumberModel.shape).toEqual('number')
			expect(numberBaseModel.shape).toEqual([
				{
					role: 'union',
					optional: false,
					shape: [
						{
							role: 'union_entry',
							optional: false,
							shape: [{ optional: false, role: 'literal_string', shape: 'foo' }],
						},
						{
							role: 'union_entry',
							optional: false,
							shape: [{ optional: false, role: 'literal_string', shape: 'bar' }],
						},
					],
				},
			])
		})
	})
})
