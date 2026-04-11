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

			it('parses aliased zod object array validators', () => {
				const endpoint = analyzeEndpointById(TestCase.parsedAliasedZodSchema)

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
