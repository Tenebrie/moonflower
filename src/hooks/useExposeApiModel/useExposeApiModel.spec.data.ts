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
