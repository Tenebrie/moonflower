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
