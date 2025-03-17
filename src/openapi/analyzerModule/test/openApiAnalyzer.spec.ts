import { Project, SyntaxKind } from 'ts-morph'

import { loadTestData } from '../../../utils/loadTestData'
import { StringValidator } from '../../../validators/BuiltInValidators'
import { discoverRouters } from '../../discoveryModule/discoverRouters/discoverRouters'
import { OpenApiManager } from '../../manager/OpenApiManager'
import { analyzeSourceFileEndpoints } from '../analyzerModule'
import { getValidatorPropertyShape, getValidatorPropertyStringValue } from '../nodeParsers'

describe('OpenApi Analyzer', () => {
	describe('when analyzing a test data file', () => {
		const dataFile = loadTestData('openApiAnalyzer.spec.data.ts')
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

		const analyzeMultiEndpointById = (id: string) => {
			analysisResult = analyzeSourceFileEndpoints(
				{
					fileName: 'test',
					sourceFile: dataFile,
					routers: discoverRouters(dataFile),
				},
				[`/test/${id}`],
			)
			const endpoints = analysisResult.filter((endpoint) => endpoint.path.startsWith(`/test/${id}`))
			if (endpoints.length === 0) {
				throw new Error(`No endpoint with id ${id} found!`)
			}
			return endpoints
		}

		describe('useApiEndpoint', () => {
			it('parses useApiEndpoint values correctly', () => {
				const endpoint = analyzeEndpointById('908c3e74-cf67-4ec7-a281-66a79f95d44d')

				expect(endpoint.name).toEqual('Test endpoint name')
				expect(endpoint.summary).toEqual('Test endpoint summary')
				expect(endpoint.description).toEqual('Test endpoint description')
				expect(endpoint.tags).toEqual(['one', 'two', 'three'])
			})

			it('parses aliased tags correctly', () => {
				const endpoint = analyzeEndpointById('f2473a55-0ac6-46a0-b3c6-aae060dbe0ab')

				expect(endpoint.tags).toEqual(['one', 'two'])
			})

			it('parses property access tags correctly', () => {
				const endpoint = analyzeEndpointById('b504a196-d31d-40a4-a901-38a0f34f6ea7')

				expect(endpoint.tags).toEqual(['one', 'two'])
			})
		})

		describe('usePathParams', () => {
			it('parses inline usePathParams validators correctly', () => {
				const endpoint = analyzeEndpointById('bf6147f2-a1dc-4cc2-8327-e6f041f828bf')

				expect(endpoint.requestPathParams[0].identifier).toEqual('firstParam')
				expect(endpoint.requestPathParams[0].signature).toEqual('string')
				expect(endpoint.requestPathParams[0].optional).toEqual(false)
				expect(endpoint.requestPathParams[1].identifier).toEqual('secondParam')
				expect(endpoint.requestPathParams[1].signature).toEqual('boolean')
				expect(endpoint.requestPathParams[1].optional).toEqual(false)
				expect(endpoint.requestPathParams[2].identifier).toEqual('optionalParam')
				expect(endpoint.requestPathParams[2].signature).toEqual('number')
				expect(endpoint.requestPathParams[2].optional).toEqual(true)
			})

			it('parses built-in usePathParams validators correctly', () => {
				const endpoint = analyzeEndpointById('ef25ef5e-0f8f-4732-bf59-8825f94a5287')

				expect(endpoint.requestPathParams[0].identifier).toEqual('firstParam')
				expect(endpoint.requestPathParams[0].signature).toEqual('string')
				expect(endpoint.requestPathParams[0].optional).toEqual(false)
				expect(endpoint.requestPathParams[1].identifier).toEqual('secondParam')
				expect(endpoint.requestPathParams[1].signature).toEqual('boolean')
				expect(endpoint.requestPathParams[1].optional).toEqual(false)
				expect(endpoint.requestPathParams[2].identifier).toEqual('optionalParam')
				expect(endpoint.requestPathParams[2].signature).toEqual('number')
				expect(endpoint.requestPathParams[2].optional).toEqual(true)
			})

			it('parses complex usePathParams validator correctly', () => {
				const endpoint = analyzeEndpointById('5ab5dd0d-b241-4378-bea1-a2dd696d699a')

				expect(endpoint.requestPathParams[0].identifier).toEqual('firstParam')
				expect(endpoint.requestPathParams[0].signature).toEqual([
					{
						role: 'property',
						identifier: 'foo',
						shape: 'string',
						optional: false,
					},
					{
						role: 'property',
						identifier: 'bar',
						shape: 'string',
						optional: false,
					},
				])
				expect(endpoint.requestPathParams[0].optional).toEqual(false)
				expect(endpoint.requestPathParams[1].identifier).toEqual('secondParam')
				expect(endpoint.requestPathParams[1].signature).toEqual([
					{
						role: 'property',
						identifier: 'foo',
						shape: 'string',
						optional: false,
					},
					{
						role: 'property',
						identifier: 'bar',
						shape: 'string',
						optional: false,
					},
				])
				expect(endpoint.requestPathParams[1].optional).toEqual(false)
			})

			it('parses usePathParams validator with optional types correctly', () => {
				const endpoint = analyzeEndpointById('209df2a1-55f9-4859-bc31-3277547c7d88')

				expect(endpoint.requestPathParams[0].identifier).toEqual('firstParam')
				expect(endpoint.requestPathParams[0].signature).toEqual([
					{
						identifier: 'foo',
						optional: true,
						role: 'property',
						shape: 'string',
					},
				])
				expect(endpoint.requestPathParams[0].optional).toEqual(false)
				expect(endpoint.requestPathParams[1].identifier).toEqual('secondParam')
				expect(endpoint.requestPathParams[1].signature).toEqual([
					{
						identifier: 'foo',
						optional: true,
						role: 'property',
						shape: 'string',
					},
				])
				expect(endpoint.requestPathParams[1].optional).toEqual(false)
			})

			it('parses usePathParams validator with union types correctly', () => {
				const endpoint = analyzeEndpointById('89d961f1-7d36-4271-8bd3-665ee0992590')

				expect(endpoint.requestPathParams[0].identifier).toEqual('firstParam')
				expect(endpoint.requestPathParams[0].signature).toEqual([
					{
						identifier: 'foo',
						optional: false,
						role: 'property',
						shape: [
							{
								role: 'union',
								optional: false,
								shape: [
									{
										role: 'union_entry',
										shape: 'string',
										optional: false,
									},
									{
										role: 'union_entry',
										shape: 'number',
										optional: false,
									},
								],
							},
						],
					},
				])
				expect(endpoint.requestPathParams[0].optional).toEqual(false)
				expect(endpoint.requestPathParams[1].identifier).toEqual('secondParam')
				expect(endpoint.requestPathParams[1].signature).toEqual([
					{
						identifier: 'foo',
						optional: false,
						role: 'property',
						shape: [
							{
								role: 'union',
								optional: false,
								shape: [
									{
										role: 'union_entry',
										shape: 'string',
										optional: false,
									},
									{
										role: 'union_entry',
										shape: 'number',
										optional: false,
									},
								],
							},
						],
					},
				])
				expect(endpoint.requestPathParams[1].optional).toEqual(false)
			})

			it('parses params with destructuring correctly', () => {
				const endpoint = analyzeEndpointById('39669151-c529-4bcd-86a5-a10de7834104')

				expect(endpoint.requestPathParams).toEqual([
					{ identifier: 'foo', optional: false, signature: 'string', description: '', errorMessage: '' },
				])
			})
		})

		describe('useQueryParams', () => {
			it('parses inline useQueryParams validators correctly', () => {
				const endpoint = analyzeEndpointById('f89310d9-25ac-4005-93e4-614179d3bbd4')

				expect(endpoint.requestQuery[0].identifier).toEqual('firstParam')
				expect(endpoint.requestQuery[0].signature).toEqual('string')
				expect(endpoint.requestQuery[0].optional).toEqual(false)
				expect(endpoint.requestQuery[1].identifier).toEqual('secondParam')
				expect(endpoint.requestQuery[1].signature).toEqual('boolean')
				expect(endpoint.requestQuery[1].optional).toEqual(true)
				expect(endpoint.requestQuery[2].identifier).toEqual('thirdParam')
				expect(endpoint.requestQuery[2].signature).toEqual('number')
				expect(endpoint.requestQuery[2].optional).toEqual(true)
			})

			it('parses enum union query type correctly', () => {
				const endpoint = analyzeEndpointById('7c51de80-1ff1-4511-b0d3-8a75c296c507')

				expect(endpoint.requestQuery[0].signature).toEqual([
					{
						role: 'union',
						shape: [
							{
								role: 'union_entry',
								shape: [{ role: 'literal_string', shape: 'dec', optional: false }],
								optional: false,
							},
							{
								role: 'union_entry',
								shape: [{ role: 'literal_string', shape: 'hex', optional: false }],
								optional: false,
							},
							{
								role: 'union_entry',
								shape: [{ role: 'literal_string', shape: 'bin', optional: false }],
								optional: false,
							},
						],
						optional: false,
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses null query type correctly', () => {
				const endpoint = analyzeEndpointById('2c5483d3-7b21-421a-92a8-34e54a008b82')

				expect(endpoint.requestQuery[0].signature).toEqual([
					{
						role: 'union',
						shape: [
							{
								role: 'union_entry',
								shape: 'null',
								optional: false,
							},
							{
								role: 'union_entry',
								shape: 'string',
								optional: false,
							},
						],
						optional: false,
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses enum query type correctly', () => {
				const endpoint = analyzeEndpointById('724a56ef-32f9-4c59-b22c-60bd33e45242')

				expect(endpoint.requestQuery[0].signature).toEqual([
					{ role: 'literal_string', shape: 'hello world', optional: false },
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses validator with description correctly', () => {
				const endpoint = analyzeEndpointById('2b9a53fa-4418-4303-9202-3f8e46f73aed')

				expect(endpoint.requestQuery[0].description).toEqual('Test description')
			})

			it('parses validator with error message correctly', () => {
				const endpoint = analyzeEndpointById('685ac7fb-18ee-4ace-b68e-a6ee354ad4db')

				expect(endpoint.requestQuery[0].errorMessage).toEqual('Test error message')
			})

			it('parses validator with tuple type correctly', () => {
				const endpoint = analyzeEndpointById('d8b07b26-5202-434c-9ff6-3fe792dad40f')

				expect(endpoint.requestQuery[0].identifier).toEqual('foo')
				expect(endpoint.requestQuery[0].signature).toEqual([
					{
						identifier: 'tuple',
						optional: false,
						role: 'property',
						shape: [
							{
								optional: false,
								role: 'tuple',
								shape: [
									{ optional: false, role: 'tuple_entry', shape: 'number' },
									{ optional: false, role: 'tuple_entry', shape: 'string' },
									{ optional: false, role: 'tuple_entry', shape: 'boolean' },
								],
							},
						],
					},
				])
			})
		})

		describe('useHeaderParams', () => {
			it('parses inline validators correctly', () => {
				const endpoint = analyzeEndpointById('03c247cb-96c0-4748-bb6a-9569c7bdb436')

				expect(endpoint.requestHeaders[0].identifier).toEqual('firstParam')
				expect(endpoint.requestHeaders[0].signature).toEqual('string')
				expect(endpoint.requestHeaders[0].optional).toEqual(false)
				expect(endpoint.requestHeaders[1].identifier).toEqual('secondParam')
				expect(endpoint.requestHeaders[1].signature).toEqual('boolean')
				expect(endpoint.requestHeaders[1].optional).toEqual(true)
				expect(endpoint.requestHeaders[2].identifier).toEqual('thirdParam')
				expect(endpoint.requestHeaders[2].signature).toEqual('number')
				expect(endpoint.requestHeaders[2].optional).toEqual(true)
			})

			it('parses validator with dashes correctly', () => {
				const endpoint = analyzeEndpointById('e563aa37-803e-4b79-a3e8-af0d01d024ae')

				expect(endpoint.requestHeaders[0].identifier).toEqual('header-with-dashes')
				expect(endpoint.requestHeaders[0].signature).toEqual('string')
				expect(endpoint.requestHeaders[0].optional).toEqual(false)
			})

			it('parses validator with description correctly', () => {
				const endpoint = analyzeEndpointById('a3e79aaa-2d0f-4481-9226-a10904e76354')

				expect(endpoint.requestHeaders[0].description).toEqual('Test description')
			})

			it('parses validator with error message correctly', () => {
				const endpoint = analyzeEndpointById('219c5c4e-1558-4d0b-85be-9753dfc14083')

				expect(endpoint.requestHeaders[0].errorMessage).toEqual('Test error message')
			})

			it('parses info from built-in validator correctly', () => {
				const endpoint = analyzeEndpointById('1ea8bc2f-3f66-4409-ba4a-289f33bcc8fd')

				expect(endpoint.requestHeaders[0].description).toEqual(StringValidator.description)
				expect(endpoint.requestHeaders[0].errorMessage).toEqual(StringValidator.errorMessage)
			})

			it('parses info from built-in wrapped validator correctly', () => {
				const endpoint = analyzeEndpointById('c679c01e-a403-4a5c-8097-3abbe891a625')

				expect(endpoint.requestHeaders[0].description).toEqual(StringValidator.description)
				expect(endpoint.requestHeaders[0].errorMessage).toEqual(StringValidator.errorMessage)
			})
		})

		describe('useRequestRawBody', () => {
			it('parses inline useRequestRawBody validator correctly', () => {
				const endpoint = analyzeEndpointById('6040cd01-a0c6-4b70-9901-b647f19b19a7')

				const body = endpoint.rawBody
				if (!body) {
					throw new Error('No body definition found')
				}
				expect(body.signature).toEqual([
					{
						identifier: 'foo',
						role: 'property',
						shape: 'string',
						optional: false,
					},
					{
						identifier: 'bar',
						role: 'property',
						shape: 'number',
						optional: true,
					},
				])
				expect(body.optional).toEqual(false)
			})

			it('parses inline useRequestRawBody validator correctly with alternative typing', () => {
				const endpoint = analyzeEndpointById('f3754325-6d9c-42b6-becf-4a9e72bd2c4e')

				const body = endpoint.rawBody
				if (!body) {
					throw new Error('No body definition found')
				}
				expect(body.signature).toEqual([
					{
						identifier: 'foo',
						role: 'property',
						shape: 'string',
						optional: false,
					},
					{
						identifier: 'bar',
						role: 'property',
						shape: 'number',
						optional: true,
					},
				])
				expect(body.optional).toEqual(false)
			})

			it('parses optional useRequestRawBody validator correctly', () => {
				const endpoint = analyzeEndpointById('1ab973ff-9937-4e2d-b432-ff43a9df42cb')

				const body = endpoint.rawBody
				if (!body) {
					throw new Error('No body definition found')
				}
				expect(body.signature).toEqual([
					{
						identifier: 'foo',
						role: 'property',
						shape: 'string',
						optional: false,
					},
					{
						identifier: 'bar',
						role: 'property',
						shape: 'number',
						optional: true,
					},
				])
				expect(body.optional).toEqual(true)
			})

			it('parses optional built-in useRequestRawBody validator correctly', () => {
				const endpoint = analyzeEndpointById('f74f6003-2aba-4f8c-855e-c0149f4217b7')

				const body = endpoint.rawBody
				if (!body) {
					throw new Error('No body definition found')
				}
				expect(body.signature).toEqual('boolean')
				expect(body.optional).toEqual(true)
			})

			it('parses description from inline validator correctly', () => {
				const endpoint = analyzeEndpointById('54768e53-4094-4e2e-96bf-8891235f264b')

				expect(endpoint.rawBody?.description).toEqual('Test description')
			})

			it('parses errorMessage from inline validator correctly', () => {
				const endpoint = analyzeEndpointById('87a1470c-3fec-492a-bc4c-ff35fc95524a')

				expect(endpoint.rawBody?.errorMessage).toEqual('Test error message')
			})

			it('parses info from built-in validator correctly', () => {
				const endpoint = analyzeEndpointById('32f51057-743a-4c37-9647-476f9a8581f3')

				expect(endpoint.rawBody?.description).toEqual(StringValidator.description)
				expect(endpoint.rawBody?.errorMessage).toEqual(StringValidator.errorMessage)
			})

			it('parses info from built-in optional validator correctly', () => {
				const endpoint = analyzeEndpointById('2fbc419b-2f1c-4782-9113-ef4125dd813b')

				expect(endpoint.rawBody?.description).toEqual(StringValidator.description)
				expect(endpoint.rawBody?.errorMessage).toEqual(StringValidator.errorMessage)
			})
		})

		describe('useRequestBody', () => {
			it('parses inline useRequestBody validators correctly', () => {
				const endpoint = analyzeEndpointById('e8e5496b-11a0-41e3-a68d-f03d524e413c')

				expect(endpoint.objectBody[0].identifier).toEqual('firstParam')
				expect(endpoint.objectBody[0].signature).toEqual('string')
				expect(endpoint.objectBody[0].optional).toEqual(false)
				expect(endpoint.objectBody[1].identifier).toEqual('secondParam')
				expect(endpoint.objectBody[1].signature).toEqual('boolean')
				expect(endpoint.objectBody[1].optional).toEqual(true)
				expect(endpoint.objectBody[2].identifier).toEqual('thirdParam')
				expect(endpoint.objectBody[2].signature).toEqual('number')
				expect(endpoint.objectBody[2].optional).toEqual(true)
			})

			it('parses optional validator correctly', () => {
				const endpoint = analyzeEndpointById('c9a2301c-babd-4512-935c-b9664803e720')

				expect(endpoint.objectBody[0].identifier).toEqual('firstParam')
				expect(endpoint.objectBody[0].signature).toEqual('string')
				expect(endpoint.objectBody[0].optional).toEqual(true)
			})

			it('parses validator with bigint correctly', () => {
				const endpoint = analyzeEndpointById('b3b9aec9-f58e-4c4b-8cf6-ca2fe11c5331')

				expect(endpoint.objectBody[0].identifier).toEqual('firstParam')
				expect(endpoint.objectBody[0].signature).toEqual('bigint')
			})
		})

		describe('endpoint return value', () => {
			it('parses simple return value correctly', () => {
				const endpoint = analyzeEndpointById('e1bedf55-6d3a-4c01-9c66-6ec74cc66c3b')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual('string')
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses multiple return values correctly', () => {
				const endpoint = analyzeEndpointById('78ad5fba-f4e2-4924-b28a-23e39dd146f7')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual('string')
				expect(endpoint.responses[1].status).toEqual(200)
				expect(endpoint.responses[1].signature).toEqual('number')
				expect(endpoint.responses[2].status).toEqual(200)
				expect(endpoint.responses[2].signature).toEqual('boolean')
				expect(endpoint.responses.length).toEqual(3)
			})

			it('parses type inferred return value object correctly', () => {
				const endpoint = analyzeEndpointById('c542cb10-538c-44eb-8d13-5111e273ead0')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
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
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses return value object with optional values correctly', () => {
				const endpoint = analyzeEndpointById('03888127-6b97-42df-b429-87a6588ab2a4')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						role: 'property',
						identifier: 'foo',
						shape: 'string',
						optional: true,
					},
					{
						role: 'property',
						identifier: 'bar',
						shape: 'number',
						optional: true,
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses return value object with union values correctly', () => {
				const endpoint = analyzeEndpointById('b73347dc-c16f-4272-95b4-bf1716bf9c14')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						identifier: 'foo',
						optional: false,
						role: 'property',
						shape: [
							{
								optional: false,
								role: 'union',
								shape: [
									{ optional: false, role: 'union_entry', shape: 'string' },
									{ optional: false, role: 'union_entry', shape: 'number' },
									{ optional: false, role: 'union_entry', shape: 'boolean' },
								],
							},
						],
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses return value object with union values in async function correctly', () => {
				const endpoint = analyzeEndpointById('666b9ed1-62db-447a-80a7-8f35ec50ab02')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						identifier: 'foo',
						optional: false,
						role: 'property',
						shape: 'number',
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses return of query params correctly', () => {
				const endpoint = analyzeEndpointById('97bb5db8-1871-4c1d-998e-a724c04c5741')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						identifier: 'foo',
						optional: false,
						role: 'property',
						shape: 'string',
					},
					{
						identifier: 'bar',
						optional: true,
						role: 'property',
						shape: 'boolean',
					},
					{
						identifier: 'baz',
						optional: true,
						role: 'property',
						shape: 'number',
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses return of union type query params correctly', () => {
				const endpoint = analyzeEndpointById('4188ebf2-eae6-4994-8732-c7f43d4da861')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						identifier: 'test',
						optional: false,
						role: 'property',
						shape: 'string',
					},
				])
				expect(endpoint.responses[1].status).toEqual(200)
				expect(endpoint.responses[1].signature).toEqual([
					{
						identifier: 'foo',
						optional: false,
						role: 'property',
						shape: 'string',
					},
					{
						identifier: 'bar',
						optional: true,
						role: 'property',
						shape: 'boolean',
					},
					{
						identifier: 'baz',
						optional: true,
						role: 'property',
						shape: 'number',
					},
				])
				expect(endpoint.responses.length).toEqual(2)
			})

			it('parses return record type correctly', () => {
				const endpoint = analyzeEndpointById('32f18a25-2408-46cf-9519-f9a8d855bf84')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						role: 'record',
						shape: [
							{
								identifier: 'foo',
								optional: false,
								role: 'property',
								shape: 'string',
							},
							{
								identifier: 'bar',
								optional: false,
								role: 'property',
								shape: 'string',
							},
						],
						optional: false,
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses no-return endpoint correctly', () => {
				const endpoint = analyzeEndpointById('196f2937-e369-435f-b239-62eaacaa6fbd')

				expect(endpoint.responses[0].status).toEqual(204)
				expect(endpoint.responses[0].signature).toEqual('void')
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses circular dependency correctly', () => {
				const endpoint = analyzeEndpointById('33a0f888-396e-4c4d-b1d9-4cf6600ab88d')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual('string')
				expect(endpoint.responses[1].status).toEqual(200)
				expect(endpoint.responses[1].signature).toEqual([
					{ role: 'array', shape: 'circular', optional: false },
				])
				expect(endpoint.responses.length).toEqual(2)
			})

			it('parses array return type correctly', () => {
				const endpoint = analyzeEndpointById('e3659429-1a05-4590-a5a6-dc80a30878e6')

				expect(endpoint.responses[0].contentType).toEqual('application/json')
				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						role: 'array',
						shape: 'string',
						optional: false,
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses intersection return type correctly', () => {
				const endpoint = analyzeEndpointById('9470a1f7-1781-43ea-aa32-4d7d71eddf4f')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						role: 'property',
						identifier: 'foo',
						shape: 'string',
						optional: false,
					},
					{
						role: 'property',
						identifier: 'bar',
						shape: 'string',
						optional: false,
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('parses intersection of union return types correctly', () => {
				const endpoint = analyzeEndpointById('be7205a2-3bc3-490e-be25-988d7ab65f20')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						identifier: 'afoo',
						optional: false,
						role: 'property',
						shape: 'string',
					},
					{
						identifier: 'befoo',
						optional: false,
						role: 'property',
						shape: 'string',
					},
				])
				expect(endpoint.responses[1].status).toEqual(200)
				expect(endpoint.responses[1].signature).toEqual([
					{
						identifier: 'afoo',
						optional: false,
						role: 'property',
						shape: 'string',
					},
					{
						identifier: 'beebar',
						optional: false,
						role: 'property',
						shape: 'string',
					},
				])
				expect(endpoint.responses[2].status).toEqual(200)
				expect(endpoint.responses[2].signature).toEqual([
					{
						identifier: 'abar',
						optional: false,
						role: 'property',
						shape: 'string',
					},
					{
						identifier: 'befoo',
						optional: false,
						role: 'property',
						shape: 'string',
					},
				])
				expect(endpoint.responses[3].status).toEqual(200)
				expect(endpoint.responses[3].signature).toEqual([
					{
						identifier: 'abar',
						optional: false,
						role: 'property',
						shape: 'string',
					},
					{
						identifier: 'beebar',
						optional: false,
						role: 'property',
						shape: 'string',
					},
				])
				expect(endpoint.responses.length).toEqual(4)
			})

			it('handles null union type correctly', () => {
				const endpoint = analyzeEndpointById('006b4d53-15a4-405e-b94d-1fa3abbd19aa')

				expect(endpoint.responses[0].status).toEqual(204)
				expect(endpoint.responses[0].signature).toEqual('null')
				expect(endpoint.responses[1].status).toEqual(200)
				expect(endpoint.responses[1].signature).toEqual('string')
				expect(endpoint.responses.length).toEqual(2)
			})

			it('handles complex null union type correctly', () => {
				const endpoint = analyzeEndpointById('a8f4e5f7-ed58-4de6-8877-b14bf14ae176')

				expect(endpoint.responses[0].status).toEqual(204)
				expect(endpoint.responses[0].signature).toEqual('null')
				expect(endpoint.responses[1].status).toEqual(200)
				expect(endpoint.responses[1].signature).toEqual('string')
				expect(endpoint.responses[2].status).toEqual(200)
				expect(endpoint.responses[2].signature).toEqual('number')
				expect(endpoint.responses.length).toEqual(3)
			})

			it('handles object with nullable param correctly', () => {
				const endpoint = analyzeEndpointById('b9fae12a-be41-4aef-9250-f6d67cd0aee6')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						identifier: 'foo',
						optional: true,
						role: 'property',
						shape: [
							{
								role: 'union',
								optional: false,
								shape: [
									{
										role: 'union_entry',
										shape: 'null',
										optional: false,
									},
									{
										role: 'union_entry',
										shape: 'string',
										optional: false,
									},
								],
							},
						],
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('handles object with Date param correctly', () => {
				const endpoint = analyzeEndpointById('dba70b93-8e8f-4731-8869-285831d18fcb')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						identifier: 'foo',
						optional: false,
						role: 'property',
						shape: 'Date',
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('handles object with bigint param correctly', () => {
				const endpoint = analyzeEndpointById('79207cfa-916a-4474-9d98-45196d2451b5')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						identifier: 'foo',
						optional: false,
						role: 'property',
						shape: 'bigint',
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('handles object with inferred bigint param correctly', () => {
				const endpoint = analyzeEndpointById('19207cfa-916a-4474-9d98-45196d2451b6')

				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].signature).toEqual([
					{
						identifier: 'foo',
						optional: false,
						role: 'property',
						shape: 'bigint',
					},
				])
				expect(endpoint.responses.length).toEqual(1)
			})

			it('handles content type of string', () => {
				const endpoint = analyzeEndpointById('61ebf020-fe62-426b-8078-43fa0b29635b')
				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].contentType).toEqual('text/plain')
			})
			it('handles content type of Buffer object', () => {
				const endpoint = analyzeEndpointById('5a39c1ff-5d17-4e9e-ad4b-56736bb01f67')
				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].contentType).toEqual('application/octet-stream')
			})
			it('handles content type of normal object', () => {
				const endpoint = analyzeEndpointById('a47c9a37-a6cb-45bd-9460-e58562f179d4')
				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].contentType).toEqual('application/json')
			})
			it('handles content type of useReturnValue', () => {
				const endpoint = analyzeEndpointById('81202d25-c5ef-44f2-be20-f1442f25540d')
				expect(endpoint.responses[0].status).toEqual(418)
				expect(endpoint.responses[0].contentType).toEqual('application/customContentType')
			})
			it('handles content type of a complex union type', () => {
				const endpoint = analyzeEndpointById('2ec01787-13d0-4512-9cf3-468f409508b7')
				expect(endpoint.responses[0].status).toEqual(200)
				expect(endpoint.responses[0].contentType).toEqual('text/plain')
				expect(endpoint.responses[1].status).toEqual(418)
				expect(endpoint.responses[1].contentType).toEqual('application/customContentType')
				expect(endpoint.responses[2].status).toEqual(200)
				expect(endpoint.responses[2].contentType).toEqual('application/json')
			})
		})

		describe('when using an exposed model', () => {
			beforeEach(() => {
				OpenApiManager.getInstance().setExposedModels([
					{
						name: 'FooBarObject',
						shape: 'string',
					},
				])
			})

			it('places a reference to the model for type inferred validator', () => {
				const endpoint = analyzeEndpointById('e917e982-b5ce-4a8f-804e-13466e7a00a2')

				expect(endpoint.requestQuery[0].identifier).toEqual('foo')
				expect(endpoint.requestQuery[0].signature).toEqual([
					{
						role: 'ref',
						shape: 'FooBarObject',
						optional: false,
					},
				])
			})

			it('places a reference to the model for explicit validator', () => {
				const endpoint = analyzeEndpointById('af22e5ff-7cbf-4aa3-8ea9-fd538a747c01')

				expect(endpoint.requestQuery[0].identifier).toEqual('foo')
				expect(endpoint.requestQuery[0].signature).toEqual([
					{
						role: 'ref',
						shape: 'FooBarObject',
						optional: false,
					},
				])
			})

			afterEach(() => {
				OpenApiManager.getInstance().reset()
			})
		})

		describe('when the same endpoint path has multiple methods', () => {
			it('adds all to the spec', () => {
				const endpoints = analyzeMultiEndpointById('e349c3c6-990b-4d97-9bde-f3bf133d2df7')

				expect(endpoints.length).toEqual(4)
				expect(endpoints[0].method).toEqual('GET')
				expect(endpoints[1].method).toEqual('POST')
				expect(endpoints[2].method).toEqual('PATCH')
				expect(endpoints[3].method).toEqual('DELETE')
			})
		})
	})

	describe('when validator is imported from another package', () => {
		let project: Project

		beforeAll(() => {
			project = new Project({
				useInMemoryFileSystem: true,
				skipFileDependencyResolution: true,
			})
		})

		it('parses shape correctly', () => {
			const sourceFile = project.createSourceFile(
				'/test-file',
				`
				export declare const StringValidator: import("./types").Validator<string> & {
					description: "Any string value.";
					errorMessage: "Must be a valid string.";
				} & {
					optional: false;
				};
				`,
			)

			const node = sourceFile
				.getFirstChild()!
				.getFirstChildByKind(SyntaxKind.VariableStatement)!
				.getFirstChildByKind(SyntaxKind.VariableDeclarationList)!
				.getFirstChildByKind(SyntaxKind.SyntaxList)!
				.getFirstChildByKind(SyntaxKind.VariableDeclaration)!
				.getFirstChildByKind(SyntaxKind.IntersectionType)!

			if (!node) {
				throw new Error('Node not found')
			}

			expect(getValidatorPropertyShape(node)).toEqual('string')
			expect(getValidatorPropertyStringValue(node, 'description')).toEqual('Any string value.')
			expect(getValidatorPropertyStringValue(node, 'errorMessage')).toEqual('Must be a valid string.')
		})
	})
})
