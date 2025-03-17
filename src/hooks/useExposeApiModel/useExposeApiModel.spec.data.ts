/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { useExposeApiModel, useExposeNamedApiModels } from './useExposeApiModel'

type FooBarObject = {
	foo: string
	bar: number
	baz: boolean
}

useExposeApiModel<FooBarObject>()
useExposeNamedApiModels<{
	SimpleString: string
	SimpleNumber: number
	SimpleBoolean: boolean
	NumberBase: 'foo' | 'bar'
}>()

type OptionalFooObject = Partial<Pick<FooBarObject, 'foo'>>
useExposeApiModel<OptionalFooObject>()

type UnionWithTuple = { fff: string | [string, string, string] }
useExposeApiModel<UnionWithTuple>()

type NumberBase = 'dec' | 'hex' | 'bin'

type ModelWithPrimitiveRecord = {
	key: Record<string, number>
}
useExposeApiModel<ModelWithPrimitiveRecord>()

type ModelWithSimpleRecord = {
	key: Record<NumberBase, number>
}
useExposeApiModel<ModelWithSimpleRecord>()

type ModelWithComplexRecord = {
	key: Record<NumberBase, NumberBase>
}
useExposeApiModel<ModelWithComplexRecord>()

const modelAsObject = {
	foo: '123',
	bar: 123,
}
useExposeApiModel<typeof modelAsObject>

useExposeNamedApiModels<{
	RenamedModelAsObject: typeof modelAsObject
}>
