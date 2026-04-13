import { describe, expect, it } from 'vitest'

import { loadTestData } from '../../../utils/loadTestData'
import { discoverRouters } from '../../discoveryModule/discoverRouters/discoverRouters'
import { analyzeSourceFileEndpoints } from '../analyzerModule'
import { TestCase } from './TestCase'

describe('OpenApi Analyzer (Zod Validator)', () => {
	describe('when analyzing a test data file', () => {
		const dataFile = loadTestData('openApiAnalyzer.zod.spec.data.ts')
		let analysisResult: ReturnType<typeof analyzeSourceFileEndpoints>

		const analyzeEndpointById = (id: string) => {
			analysisResult = analyzeSourceFileEndpoints(
				{
					fileName: 'test',
					sourceFile: dataFile,
					routers: discoverRouters(dataFile),
				},
				[`/test/${id}`],
			)
			const endpoint = analysisResult.find((endpoint) => endpoint.path.startsWith(`/test/${id}`))
			if (!endpoint) {
				throw new Error(`No endpoint with id ${id} found!`)
			}
			return endpoint
		}

		describe('zod validators', () => {
			it('parses inline zod number validators', () => {
				const endpoint = analyzeEndpointById(TestCase.parsesInlineZodNumber)

				expect(endpoint.requestPathParams[0].identifier).toEqual('id')
				expect(endpoint.requestPathParams[0].signature).toEqual('number')
				expect(endpoint.requestPathParams[0].optional).toEqual(false)

				expect(endpoint.objectBody[0].identifier).toEqual('data')
				expect(endpoint.objectBody[0].signature).toEqual('number')
				expect(endpoint.objectBody[0].optional).toEqual(false)
			})

			it('parses inline zod string validators', () => {
				const endpoint = analyzeEndpointById(TestCase.parsesInlineZodString)

				expect(endpoint.requestPathParams[0].identifier).toEqual('id')
				expect(endpoint.requestPathParams[0].signature).toEqual('string')
				expect(endpoint.requestPathParams[0].optional).toEqual(false)

				expect(endpoint.objectBody[0].identifier).toEqual('data')
				expect(endpoint.objectBody[0].signature).toEqual('string')
				expect(endpoint.objectBody[0].optional).toEqual(false)
			})

			it('parses inline zod object validators', () => {
				const endpoint = analyzeEndpointById(TestCase.parsesInlineZodObject)

				expect(endpoint.requestPathParams[0].identifier).toEqual('id')
				expect(endpoint.requestPathParams[0].signature).toEqual([
					{
						identifier: 'value',
						optional: false,
						role: 'property',
						shape: 'number',
					},
				])
				expect(endpoint.requestPathParams[0].optional).toEqual(false)

				expect(endpoint.objectBody[0].identifier).toEqual('data')
				expect(endpoint.objectBody[0].signature).toEqual([
					{
						identifier: 'value',
						optional: false,
						role: 'property',
						shape: 'number',
					},
				])
				expect(endpoint.objectBody[0].optional).toEqual(false)
			})

			it('parses inline zod number array validators', () => {
				const endpoint = analyzeEndpointById(TestCase.parsesInlineZodNumberArray)

				expect(endpoint.requestPathParams[0].identifier).toEqual('id')
				expect(endpoint.requestPathParams[0].signature).toEqual([
					{
						role: 'array',
						shape: 'number',
						optional: false,
					},
				])
				expect(endpoint.requestPathParams[0].optional).toEqual(false)
				expect(endpoint.objectBody[0].identifier).toEqual('data')
				expect(endpoint.objectBody[0].signature).toEqual([
					{
						role: 'array',
						shape: 'number',
						optional: false,
					},
				])
				expect(endpoint.objectBody[0].optional).toEqual(false)
			})

			it('parses inline zod object array validators', () => {
				const endpoint = analyzeEndpointById(TestCase.parsesInlineZodObjectArray)

				expect(endpoint.requestPathParams[0].identifier).toEqual('id')
				expect(endpoint.requestPathParams[0].signature).toEqual([
					{
						role: 'array',
						shape: [
							{
								identifier: 'value',
								optional: false,
								role: 'property',
								shape: 'number',
							},
						],
						optional: false,
					},
				])
				expect(endpoint.requestPathParams[0].optional).toEqual(false)

				expect(endpoint.objectBody[0].identifier).toEqual('data')
				expect(endpoint.objectBody[0].signature).toEqual([
					{
						role: 'array',
						shape: [
							{
								identifier: 'value',
								optional: false,
								role: 'property',
								shape: 'number',
							},
						],
						optional: false,
					},
				])
				expect(endpoint.objectBody[0].optional).toEqual(false)
			})

			it('parses inline zod enum validators', () => {
				const endpoint = analyzeEndpointById(TestCase.parsesInlineZodEnum)

				const expectedSignature = [
					{
						role: 'union',
						optional: false,
						shape: [
							{
								role: 'union_entry',
								shape: [
									{
										optional: false,
										role: 'literal_string',
										shape: 'Normal',
									},
								],
								optional: false,
							},
							{
								role: 'union_entry',
								shape: [
									{
										optional: false,
										role: 'literal_string',
										shape: 'Reversed',
									},
								],
								optional: false,
							},
						],
					},
				]

				expect(endpoint.requestPathParams[0].identifier).toEqual('direction')
				expect(endpoint.requestPathParams[0].signature).toEqual(expectedSignature)
				expect(endpoint.requestPathParams[0].optional).toEqual(false)

				expect(endpoint.objectBody[0].identifier).toEqual('direction')
				expect(endpoint.objectBody[0].signature).toEqual(expectedSignature)
				expect(endpoint.objectBody[0].optional).toEqual(false)
				expect(endpoint.objectBody[1].identifier).toEqual('optionalDirection')
				expect(endpoint.objectBody[1].signature).toEqual(expectedSignature)
				expect(endpoint.objectBody[1].optional).toEqual(true)
			})

			it('parses zod optional validators', () => {
				const endpoint = analyzeEndpointById(TestCase.parsesZodOptional)

				expect(endpoint.objectBody[0].identifier).toEqual('requiredField')
				expect(endpoint.objectBody[0].signature).toEqual('string')
				expect(endpoint.objectBody[0].optional).toEqual(false)

				expect(endpoint.objectBody[1].identifier).toEqual('optionalField')
				expect(endpoint.objectBody[1].signature).toEqual('string')
				expect(endpoint.objectBody[1].optional).toEqual(true)

				expect(endpoint.objectBody[2].identifier).toEqual('optionalNumber')
				expect(endpoint.objectBody[2].signature).toEqual('number')
				expect(endpoint.objectBody[2].optional).toEqual(true)
			})

			it('parses aliased zod object array validators', () => {
				const endpoint = analyzeEndpointById(TestCase.parsesAliasedZodSchema)

				expect(endpoint.requestPathParams[0].identifier).toEqual('id')
				expect(endpoint.requestPathParams[0].signature).toEqual([
					{
						role: 'array',
						shape: [
							{
								identifier: 'value',
								optional: false,
								role: 'property',
								shape: 'number',
							},
						],
						optional: false,
					},
				])
				expect(endpoint.requestPathParams[0].optional).toEqual(false)

				expect(endpoint.objectBody[0].identifier).toEqual('data')
				expect(endpoint.objectBody[0].signature).toEqual([
					{
						role: 'array',
						shape: [
							{
								identifier: 'value',
								optional: false,
								role: 'property',
								shape: 'number',
							},
						],
						optional: false,
					},
				])
				expect(endpoint.objectBody[0].optional).toEqual(false)
			})
		})
	})
})
