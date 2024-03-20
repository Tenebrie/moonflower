import * as path from 'path'
import { Project, SourceFile } from 'ts-morph'

import { analyzeSourceFileExposedModels } from '../../openapi/analyzerModule/analyzerModule'
import { useExposeApiModel, useExposeNamedApiModels } from './useExposeApiModel'

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
				throw new Error('Test data file not found')
			}

			dataFile = sourceFile
		})

		it('does not have side effects when invoked directly', () => {
			useExposeApiModel()
			useExposeNamedApiModels()
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

		it('parses model with type utilities correctly', () => {
			const optionalFooObject = analyzeModelByName('OptionalFooObject')

			expect(optionalFooObject).toEqual({
				name: 'OptionalFooObject',
				shape: [{ identifier: 'foo', optional: true, role: 'property', shape: 'string' }],
			})
		})

		it('parses model with tuple correctly', () => {
			const unionWithTupleObject = analyzeModelByName('UnionWithTuple')

			expect(unionWithTupleObject).toEqual({
				name: 'UnionWithTuple',
				shape: [
					{
						role: 'property',
						identifier: 'fff',
						shape: [
							{
								role: 'union',
								shape: [
									{ role: 'union_entry', shape: 'string', optional: false },
									{
										role: 'union_entry',
										shape: [
											{
												role: 'tuple',
												shape: [
													{
														role: 'tuple_entry',
														shape: 'string',
														optional: false,
													},
													{
														role: 'tuple_entry',
														shape: 'string',
														optional: false,
													},
													{
														role: 'tuple_entry',
														shape: 'string',
														optional: false,
													},
												],
												optional: false,
											},
										],
										optional: false,
									},
								],
								optional: false,
							},
						],
						optional: false,
					},
				],
			})
		})

		it('parses model with primitive Record correctly', () => {
			const modelWithRecord = analyzeModelByName('ModelWithPrimitiveRecord')

			expect(modelWithRecord).toEqual({
				name: 'ModelWithPrimitiveRecord',
				shape: [
					{
						role: 'property',
						identifier: 'key',
						shape: [{ role: 'record', shape: 'number', optional: false }],
						optional: false,
					},
				],
			})
		})

		it('parses model with simple Record correctly', () => {
			const modelWithRecord = analyzeModelByName('ModelWithSimpleRecord')

			expect(modelWithRecord).toEqual({
				name: 'ModelWithSimpleRecord',
				shape: [
					{
						role: 'property',
						identifier: 'key',
						shape: [
							{
								role: 'property',
								identifier: 'dec',
								shape: 'number',
								optional: false,
							},
							{
								role: 'property',
								identifier: 'hex',
								shape: 'number',
								optional: false,
							},
							{
								role: 'property',
								identifier: 'bin',
								shape: 'number',
								optional: false,
							},
						],
						optional: false,
					},
				],
			})
		})

		it('parses model with complex Record correctly', () => {
			const modelWithRecord = analyzeModelByName('ModelWithComplexRecord')

			expect(modelWithRecord).toEqual({
				name: 'ModelWithComplexRecord',
				shape: [
					{
						role: 'property',
						identifier: 'key',
						shape: [
							{
								role: 'property',
								identifier: 'dec',
								shape: [
									{
										role: 'union',
										shape: [
											{
												role: 'union_entry',
												shape: [
													{
														role: 'literal_string',
														shape: 'dec',
														optional: false,
													},
												],
												optional: false,
											},
											{
												role: 'union_entry',
												shape: [
													{
														role: 'literal_string',
														shape: 'hex',
														optional: false,
													},
												],
												optional: false,
											},
											{
												role: 'union_entry',
												shape: [
													{
														role: 'literal_string',
														shape: 'bin',
														optional: false,
													},
												],
												optional: false,
											},
										],
										optional: false,
									},
								],
								optional: false,
							},
							{
								role: 'property',
								identifier: 'hex',
								shape: [
									{
										role: 'union',
										shape: [
											{
												role: 'union_entry',
												shape: [
													{
														role: 'literal_string',
														shape: 'dec',
														optional: false,
													},
												],
												optional: false,
											},
											{
												role: 'union_entry',
												shape: [
													{
														role: 'literal_string',
														shape: 'hex',
														optional: false,
													},
												],
												optional: false,
											},
											{
												role: 'union_entry',
												shape: [
													{
														role: 'literal_string',
														shape: 'bin',
														optional: false,
													},
												],
												optional: false,
											},
										],
										optional: false,
									},
								],
								optional: false,
							},
							{
								role: 'property',
								identifier: 'bin',
								shape: [
									{
										role: 'union',
										shape: [
											{
												role: 'union_entry',
												shape: [
													{
														role: 'literal_string',
														shape: 'dec',
														optional: false,
													},
												],
												optional: false,
											},
											{
												role: 'union_entry',
												shape: [
													{
														role: 'literal_string',
														shape: 'hex',
														optional: false,
													},
												],
												optional: false,
											},
											{
												role: 'union_entry',
												shape: [
													{
														role: 'literal_string',
														shape: 'bin',
														optional: false,
													},
												],
												optional: false,
											},
										],
										optional: false,
									},
								],
								optional: false,
							},
						],
						optional: false,
					},
				],
			})
		})
	})
})
