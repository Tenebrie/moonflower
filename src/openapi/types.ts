import { ShapeOfType } from './analyzerModule/types'
import { SchemaType } from './generatorModule/getSchema'

type PathParam = {
	name: string
	in: 'query' | 'path' | 'header'
	description: string
	required: true | false | undefined
}

export type PathDefinition = {
	summary?: string
	description: string
	operationId?: string
	parameters: PathParam[]
	requestBody: any
	responses: Record<
		string,
		{
			description: string
			content?: {
				'application/json': {
					schema: {
						oneOf: SchemaType[]
					}
				}
			}
		}
	>
}

export type ExposedModelData = {
	name: string
	shape: string | ShapeOfType[]
}

export type EndpointData = {
	method: 'GET' | 'POST'
	path: string
	name?: string
	summary?: string
	description?: string
	requestPathParams: {
		identifier: string
		signature: string | ShapeOfType[]
		optional: boolean
		description?: string
		errorMessage?: string
	}[]
	requestQuery: {
		identifier: string
		signature: string | ShapeOfType[]
		optional: boolean
		description?: string
		errorMessage?: string
	}[]
	requestHeaders: {
		identifier: string
		signature: string | ShapeOfType[]
		optional: boolean
		description?: string
		errorMessage?: string
	}[]
	rawBody?: {
		signature: string | ShapeOfType[]
		optional: boolean
		description?: string
		errorMessage?: string
	}
	objectBody: {
		identifier: string
		signature: string | ShapeOfType[]
		optional: boolean
		description?: string
		errorMessage?: string
	}[]
	responses: {
		status: number
		signature: string | ShapeOfType[]
		description?: string
		errorMessage?: string
	}[]
}
