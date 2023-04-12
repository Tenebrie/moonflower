import {
	ShapeOfNumberLiteral,
	ShapeOfProperty,
	ShapeOfRecord,
	ShapeOfRef,
	ShapeOfStringLiteral,
	ShapeOfTuple,
	ShapeOfType,
	ShapeOfUnion,
} from '../../openapi/analyzerModule/types'

export type SchemaType =
	| { type: string }
	| { type: string; properties: Record<string, SchemaType>; required: string[] }
	| { oneOf: SchemaType[] }
	| { allOf: SchemaType[] }
	| { type: 'array'; items: SchemaType }
	| { type: 'array'; items: SchemaType; minItems: number; maxItems: number }
	| { type: 'object'; additionalProperties: SchemaType }
	| { type: 'string'; enum: string[] }
	| { type: 'string'; format: string }
	| { type: 'number'; enum: string[] }
	| { $ref: string }

export const getSchema = (shape: string | ShapeOfType[]): SchemaType => {
	if (typeof shape === 'string' && shape === 'any') {
		return generateAny()
	}

	if (typeof shape === 'string' && shape === 'circular') {
		return generateAny()
	}

	if (typeof shape === 'string' && shape === 'Date') {
		return {
			type: 'string',
			format: 'date-time',
		}
	}

	if (typeof shape === 'string' && shape === 'bigint') {
		return {
			type: 'string',
			format: 'bigint',
		}
	}

	if (typeof shape === 'string') {
		return {
			type: shape,
		}
	}

	if (shape.length === 0) {
		return {
			type: 'unknown_20',
		}
	}

	const isStringLiteral = shape[0].role === 'literal_string'
	if (isStringLiteral) {
		const typedShape = shape[0] as ShapeOfStringLiteral
		return {
			type: 'string',
			enum: [typedShape.shape],
		}
	}

	const isNumberLiteral = shape[0].role === 'literal_number'
	if (isNumberLiteral) {
		const typedShape = shape[0] as ShapeOfNumberLiteral
		return {
			type: 'number',
			enum: [typedShape.shape],
		}
	}

	const isObject = shape[0].role === 'property'
	if (isObject) {
		const typedShapes = shape as ShapeOfProperty[]
		const properties: Record<string, SchemaType> = {}
		typedShapes.forEach((prop) => {
			properties[prop.identifier] = getSchema(prop.shape)
		})
		const required = typedShapes.filter((prop) => !prop.optional).map((prop) => prop.identifier)
		return {
			type: 'object',
			properties,
			required: required.length > 0 ? required : undefined,
		}
	}

	const isUnion = shape[0].role === 'union'
	if (isUnion) {
		const typedShape = shape[0] as ShapeOfUnion
		return {
			oneOf: typedShape.shape.map((unionEntry) => getSchema(unionEntry.shape)),
		}
	}

	const isRecord = shape[0].role === 'record'
	if (isRecord) {
		const recordShape = shape[0] as ShapeOfRecord
		return {
			type: 'object',
			additionalProperties: getSchema(recordShape.shape),
		}
	}

	const isArray = shape[0].role === 'array'
	if (isArray) {
		return {
			type: 'array',
			items: getSchema(shape[0].shape),
		}
	}

	const isRef = shape[0].role === 'ref'
	if (isRef) {
		const refShape = shape[0] as ShapeOfRef
		return {
			$ref: `#/components/schemas/${refShape.shape}`,
		}
	}

	const isTuple = shape[0].role === 'tuple'
	if (isTuple) {
		const tupleShape = shape[0] as ShapeOfTuple
		const tupleEntries = tupleShape.shape
		return {
			type: 'array',
			items: {
				oneOf: tupleEntries.map((entry) => getSchema(entry.shape)),
			},
			minItems: tupleEntries.length,
			maxItems: tupleEntries.length,
		}
	}

	return {
		type: 'unknown_21',
	}
}

const generateAny = () => ({
	oneOf: [
		{
			type: 'string',
		},
		{
			type: 'boolean',
		},
		{
			type: 'number',
		},
		{
			type: 'object',
		},
		{
			type: 'array',
		},
	],
})
