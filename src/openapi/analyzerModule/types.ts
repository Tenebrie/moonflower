export type ShapeOfType =
	| ShapeOfProperty
	| ShapeOfStringLiteral
	| ShapeOfNumberLiteral
	| ShapeOfUnion
	| ShapeOfUnionEntry
	| ShapeOfRecord
	| ShapeOfArray
	| ShapeOfRef
	| ShapeOfTuple
	| ShapeOfTupleEntry

export type ShapeOfProperty = {
	role: 'property'
	identifier: string
	shape: string | ShapeOfType[]
	optional: boolean
}

export type ShapeOfStringLiteral = {
	role: 'literal_string'
	shape: string
	optional: boolean
}

export type ShapeOfNumberLiteral = {
	role: 'literal_number'
	shape: string
	optional: boolean
}

export type ShapeOfUnion = {
	role: 'union'
	shape: ShapeOfUnionEntry[]
	optional: boolean
}

export type ShapeOfUnionEntry = {
	role: 'union_entry'
	shape: string | ShapeOfType[]
	optional: boolean
}

export type ShapeOfRecord = {
	role: 'record'
	shape: string | ShapeOfType[]
	optional: boolean
}

export type ShapeOfArray = {
	role: 'array'
	shape: string | ShapeOfType[]
	optional: boolean
}

export type ShapeOfRef = {
	role: 'ref'
	shape: string
	optional: boolean
}

export type ShapeOfTuple = {
	role: 'tuple'
	shape: ShapeOfTupleEntry[]
	optional: boolean
}

export type ShapeOfTupleEntry = {
	role: 'tuple_entry'
	shape: string | ShapeOfType[]
	optional: boolean
}
