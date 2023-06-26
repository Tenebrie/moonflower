/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ApiDocsPreferences } from '../manager/OpenApiManager'
import { EndpointData, PathDefinition } from '../types'
import { getSchema } from './getSchema'

export const generatePaths = (endpoints: EndpointData[], preferences: ApiDocsPreferences) => {
	const paths: Record<
		string,
		{
			get?: PathDefinition
			post?: PathDefinition
			put?: PathDefinition
			patch?: PathDefinition
			delete?: PathDefinition
		}
	> = {}

	const { allowOptionalPathParams } = preferences

	endpoints.forEach((endpoint) => {
		const path = endpoint.path
			.split('/')
			.map((param) => {
				if (param.startsWith(':')) {
					return `{${param.substring(1).replace('?', '')}}`
				}
				return param
			})
			.join('/')

		const pathParams = endpoint.requestPathParams.map((param) => ({
			name: param.identifier,
			in: 'path' as const,
			description:
				param.optional && !allowOptionalPathParams
					? `(Optional parameter) ${param.description}`
					: param.description ?? '',
			required: !allowOptionalPathParams || !param.optional,
			schema: getSchema(param.signature),
		}))

		const queryParams = endpoint.requestQuery.map((param) => ({
			name: param.identifier,
			in: 'query' as const,
			description: param.description ?? '',
			required: !param.optional,
			schema: getSchema(param.signature),
		}))

		const headerParams = endpoint.requestHeaders.map((param) => ({
			name: param.identifier,
			in: 'header' as const,
			description: param.description ?? '',
			required: !param.optional,
			schema: getSchema(param.signature),
		}))

		const acceptedBodyTypes: Partial<
			Record<'text/plain' | 'application/json' | 'application/x-www-form-urlencoded', unknown>
		> = {}

		if (endpoint.rawBody) {
			acceptedBodyTypes['text/plain'] = {
				schema: getSchema(endpoint.rawBody.signature),
			}
		}

		if (endpoint.objectBody.length > 0) {
			const properties: Record<string, unknown> = {}
			endpoint.objectBody.forEach((prop) => {
				properties[prop.identifier] = getSchema(prop.signature)
			})
			const required = endpoint.objectBody.filter((prop) => !prop.optional).map((prop) => prop.identifier)
			const content = {
				schema: {
					type: 'object',
					properties,
					required: required.length > 0 ? required : undefined,
				},
			}
			acceptedBodyTypes['application/json'] = content
			acceptedBodyTypes['application/x-www-form-urlencoded'] = content
		}

		const requestsWithBody = ['POST', 'PATCH', 'PUT']
		const requestBody =
			requestsWithBody.includes(endpoint.method) && Object.keys(acceptedBodyTypes).length > 0
				? { content: acceptedBodyTypes }
				: undefined

		const responses: PathDefinition['responses'] = {}
		endpoint.responses.forEach((response) => {
			const status = String(response.status)

			const existingSchemas = responses[status]?.['content']?.['application/json']['schema']['oneOf'] ?? []

			const responseSchema = getSchema(response.signature)
			const content = (() => {
				if ('type' in responseSchema && (responseSchema.type === 'void' || responseSchema.type === 'null')) {
					return undefined
				}

				return {
					'application/json': {
						schema: {
							oneOf: [...existingSchemas, getSchema(response.signature)],
						},
					},
				}
			})()

			responses[status] = {
				description: response.description || '',
				content,
			}
		})

		const definition: PathDefinition = {
			operationId: endpoint.name,
			summary: endpoint.summary,
			description: endpoint.description ?? '',
			parameters: ([] as PathDefinition['parameters'])
				.concat(pathParams)
				.concat(queryParams)
				.concat(headerParams),
			requestBody: requestBody,
			responses: responses,
			tags: endpoint.tags,
		}

		paths[path] = {
			...paths[path],
			[endpoint.method.toLowerCase()]: definition,
		}
	})

	return paths
}
