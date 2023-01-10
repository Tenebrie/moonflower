import { OpenApiManager } from '../../manager/OpenApiManager'
import { EndpointData, ExposedModelData } from '../../types'
import { generateOpenApiSpec } from '../generatorModule'
import { manyEndpointsData, manyEndpointsResults } from './openApiGenerator.spec.data'

describe('OpenApi Generator', () => {
	const createManager = (models: ExposedModelData[], endpoints: EndpointData[]): OpenApiManager => {
		return new OpenApiManager(
			{
				title: 'Default title',
				version: '1.0.0',
			},
			models,
			endpoints,
			{
				allowOptionalPathParams: false,
			}
		)
	}

	const createManagerWithEndpoints = (endpoints: EndpointData[]): OpenApiManager => {
		return new OpenApiManager(
			{
				title: 'Default title',
				version: '1.0.0',
			},
			[],
			endpoints,
			{
				allowOptionalPathParams: false,
			}
		)
	}

	const createManagerWithModels = (models: ExposedModelData[]): OpenApiManager => {
		return new OpenApiManager(
			{
				title: 'Default title',
				version: '1.0.0',
			},
			models,
			[],
			{
				allowOptionalPathParams: false,
			}
		)
	}

	const minimalEndpointData: EndpointData = {
		method: 'GET',
		path: '/test/path',
		requestPathParams: [],
		requestQuery: [],
		requestHeaders: [],
		objectBody: [],
		responses: [],
	}

	it('does not include responses field if no responses are available', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				responses: [
					{
						status: 204,
						signature: 'void',
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.responses[204].content).toEqual(undefined)
	})

	it('includes record response correctly', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				responses: [
					{
						status: 200,
						signature: [
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
										optional: true,
										role: 'property',
										shape: 'boolean',
									},
								],
								optional: false,
							},
						],
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.responses[200].content).toEqual({
			'application/json': {
				schema: {
					oneOf: [
						{
							type: 'object',
							additionalProperties: {
								type: 'object',
								properties: { bar: { type: 'boolean' }, foo: { type: 'string' } },
								required: ['foo'],
							},
						},
					],
				},
			},
		})
	})

	it('generates correct spec for many endpoints', () => {
		const manager = createManagerWithEndpoints(manyEndpointsData)
		const spec = generateOpenApiSpec(manager)

		expect(spec).toEqual(manyEndpointsResults)
	})

	it('generates correct spec for circular dependency', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				responses: [
					{
						status: 200,
						signature: [
							{
								role: 'property',
								identifier: 'foo',
								shape: 'circular',
								optional: false,
							},
						],
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.responses[200].content).toEqual({
			'application/json': {
				schema: {
					oneOf: [
						{
							type: 'object',
							properties: {
								foo: {
									oneOf: [
										{ type: 'string' },
										{ type: 'boolean' },
										{ type: 'number' },
										{ type: 'object' },
										{ type: 'array' },
									],
								},
							},
							required: ['foo'],
						},
					],
				},
			},
		})
	})

	it('generates correct spec for array in responses', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				responses: [
					{
						status: 200,
						signature: [
							{
								role: 'array',
								shape: 'string',
								optional: false,
							},
						],
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get).toEqual({
			description: '',
			parameters: [],
			responses: {
				'200': {
					description: '',
					content: {
						'application/json': {
							schema: {
								oneOf: [
									{
										type: 'array',
										items: {
											type: 'string',
										},
									},
								],
							},
						},
					},
				},
			},
		})
	})

	it('generates correct spec for any in responses', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				responses: [
					{
						status: 200,
						signature: [
							{
								identifier: 'foo',
								role: 'property',
								shape: 'any',
								optional: false,
							},
						],
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.responses[200].content).toEqual({
			'application/json': {
				schema: {
					oneOf: [
						{
							type: 'object',
							properties: {
								foo: {
									oneOf: [
										{ type: 'string' },
										{ type: 'boolean' },
										{ type: 'number' },
										{ type: 'object' },
										{ type: 'array' },
									],
								},
							},
							required: ['foo'],
						},
					],
				},
			},
		})
	})

	it('generates correct spec for string literal union', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				responses: [
					{
						status: 200,
						signature: [
							{
								role: 'union',
								shape: [
									{
										role: 'union_entry',
										shape: [{ role: 'literal_string', shape: 'bin', optional: false }],
										optional: false,
									},
									{
										role: 'union_entry',
										shape: [{ role: 'literal_string', shape: 'hex', optional: false }],
										optional: false,
									},
									{
										role: 'union_entry',
										shape: [{ role: 'literal_number', shape: '10', optional: false }],
										optional: false,
									},
								],
								optional: false,
							},
						],
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.responses[200].content).toEqual({
			'application/json': {
				schema: {
					oneOf: [
						{
							oneOf: [
								{ type: 'string', enum: ['bin'] },
								{ type: 'string', enum: ['hex'] },
								{ type: 'number', enum: ['10'] },
							],
						},
					],
				},
			},
		})
	})

	it('generates correct spec for string literal', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				responses: [
					{
						status: 200,
						signature: [{ role: 'literal_string', shape: 'hello world', optional: false }],
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.responses[200].content).toEqual({
			'application/json': { schema: { oneOf: [{ type: 'string', enum: ['hello world'] }] } },
		})
	})

	it('generates correct spec for request headers', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				requestHeaders: [
					{
						identifier: 'x-auth',
						signature: 'string',
						optional: false,
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.parameters[0]).toEqual({
			name: 'x-auth',
			in: 'header',
			description: '',
			required: true,
			schema: {
				type: 'string',
			},
		})
	})

	it('includes descriptions if provided in request headers', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				requestHeaders: [
					{
						identifier: 'x-auth',
						signature: 'string',
						optional: false,
						description: 'Test description',
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.parameters[0].in).toEqual('header')
		expect(spec.paths['/test/path'].get?.parameters[0].description).toEqual('Test description')
	})

	it('includes descriptions if provided in request path params', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				requestPathParams: [
					{
						identifier: 'pathParam',
						signature: 'string',
						optional: false,
						description: 'Test description',
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.parameters[0].in).toEqual('path')
		expect(spec.paths['/test/path'].get?.parameters[0].description).toEqual('Test description')
	})

	it('includes descriptions if provided in optional request path params', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				requestPathParams: [
					{
						identifier: 'pathParam',
						signature: 'string',
						optional: true,
						description: 'Test description',
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.parameters[0].in).toEqual('path')
		expect(spec.paths['/test/path'].get?.parameters[0].description).toEqual(
			'(Optional parameter) Test description'
		)
	})

	it('includes descriptions if provided in request path params', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				requestQuery: [
					{
						identifier: 'pathParam',
						signature: 'string',
						optional: false,
						description: 'Test description',
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.parameters[0].in).toEqual('query')
		expect(spec.paths['/test/path'].get?.parameters[0].description).toEqual('Test description')
	})

	it('includes descriptions if provided in response', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				responses: [
					{
						status: 200,
						signature: 'string',
						description: 'Test description',
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.responses[200].description).toEqual('Test description')
	})

	it('includes exposed models as references', () => {
		const manager = createManager(
			[
				{
					name: 'FooBarObject',
					shape: [
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
					],
				},
			],
			[
				{
					...minimalEndpointData,
					requestQuery: [
						{
							identifier: 'pathParam',
							signature: [
								{
									role: 'ref',
									shape: 'FooBarObject',
									optional: false,
								},
							],
							optional: false,
						},
					],
				},
			]
		)
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.parameters[0]).toEqual({
			name: 'pathParam',
			in: 'query',
			description: '',
			required: true,
			schema: {
				$ref: '#/components/schemas/FooBarObject',
			},
		})
	})

	it('includes exposed models as component schemas', () => {
		const manager = createManagerWithModels([
			{
				name: 'FooBarObject',
				shape: [
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
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.components.schemas['FooBarObject']).toEqual({
			type: 'object',
			properties: {
				['foo']: {
					type: 'string',
				},
				['bar']: {
					type: 'string',
				},
			},
			required: ['foo', 'bar'],
		})
	})

	it('generates correct spec for tuple', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				requestQuery: [
					{
						identifier: 'foo',
						signature: [
							{
								role: 'tuple',
								shape: [
									{ optional: false, role: 'tuple_entry', shape: 'number' },
									{ optional: false, role: 'tuple_entry', shape: 'string' },
									{ optional: false, role: 'tuple_entry', shape: 'boolean' },
								],
								optional: false,
							},
						],
						optional: false,
					},
				],
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path'].get?.parameters[0]).toEqual({
			name: 'foo',
			in: 'query',
			description: '',
			required: true,
			schema: {
				type: 'array',
				items: {
					oneOf: [{ type: 'number' }, { type: 'string' }, { type: 'boolean' }],
				},
				minItems: 3,
				maxItems: 3,
			},
		})
	})

	it('generates correct spec for endpoint with multiple methods', () => {
		const manager = createManagerWithEndpoints([
			{
				...minimalEndpointData,
				method: 'GET',
				path: '/test/path/:id',
			},
			{
				...minimalEndpointData,
				method: 'POST',
				path: '/test/path/:id',
			},
			{
				...minimalEndpointData,
				method: 'PUT',
				path: '/test/path/:id',
			},
			{
				...minimalEndpointData,
				method: 'DELETE',
				path: '/test/path/:id',
			},
		])
		const spec = generateOpenApiSpec(manager)

		expect(spec.paths['/test/path/{id}'].get).not.toBe(undefined)
		expect(spec.paths['/test/path/{id}'].post).not.toBe(undefined)
		expect(spec.paths['/test/path/{id}'].put).not.toBe(undefined)
		expect(spec.paths['/test/path/{id}'].delete).not.toBe(undefined)
	})
})
