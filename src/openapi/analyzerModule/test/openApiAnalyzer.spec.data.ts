import { useApiEndpoint } from '../../../hooks/useApiEndpoint'
import {
	useExposeApiModel,
	useExposeNamedApiModels,
} from '../../../hooks/useExposeApiModel/useExposeApiModel'
import { useHeaderParams } from '../../../hooks/useHeaderParams'
import { usePathParams } from '../../../hooks/usePathParams'
import { useQueryParams } from '../../../hooks/useQueryParams'
import { useRequestBody } from '../../../hooks/useRequestBody'
import { useRequestRawBody } from '../../../hooks/useRequestRawBody'
import { Router } from '../../../router/Router'
import {
	BigIntValidator,
	BooleanValidator,
	NumberValidator,
	StringValidator,
} from '../../../validators/BuiltInValidators'
import { OptionalParam, PathParam, RequiredParam } from '../../../validators/ParamWrappers'

const router = new Router()

router.get('/test/908c3e74-cf67-4ec7-a281-66a79f95d44d', () => {
	useApiEndpoint({
		name: 'Test endpoint name',
		summary: 'Test endpoint summary',
		description: 'Test endpoint description',
		tags: ['one', 'two', 'three'],
	})
})

router.get('/test/f2473a55-0ac6-46a0-b3c6-aae060dbe0ab', () => {
	const firstTag = 'one'
	const secondTag = 'two'
	useApiEndpoint({
		tags: [firstTag, secondTag],
	})
})

router.get('/test/b504a196-d31d-40a4-a901-38a0f34f6ea7', () => {
	const tagContainer = {
		firstTag: 'one',
		secondTag: 'two',
	}
	useApiEndpoint({
		tags: [tagContainer.firstTag, tagContainer.secondTag],
	})
})

router.get('/test/bf6147f2-a1dc-4cc2-8327-e6f041f828bf/:firstParam/:secondParam/:optionalParam?', (ctx) => {
	usePathParams(ctx, {
		firstParam: PathParam({
			rehydrate: (v) => v,
		}),
		secondParam: PathParam({
			rehydrate: (v) => v === '1',
		}),
		optionalParam: PathParam({
			rehydrate: (v) => Number(v),
		}),
	})
})

router.get('/test/ef25ef5e-0f8f-4732-bf59-8825f94a5287/:firstParam/:secondParam/:optionalParam?', (ctx) => {
	usePathParams(ctx, {
		firstParam: StringValidator,
		secondParam: PathParam(BooleanValidator),
		optionalParam: NumberValidator,
	})
})

router.get('/test/5ab5dd0d-b241-4378-bea1-a2dd696d699a/:firstParam/:secondParam', (ctx) => {
	usePathParams(ctx, {
		firstParam: PathParam({
			rehydrate: (v) => JSON.parse(v) as { foo: string; bar: string },
		}),
		secondParam: PathParam<{ foo: string; bar: string }>({
			rehydrate: (v) => JSON.parse(v),
		}),
	})
})

router.get('/test/209df2a1-55f9-4859-bc31-3277547c7d88/:firstParam/:secondParam', (ctx) => {
	usePathParams(ctx, {
		firstParam: PathParam({
			rehydrate: (v) => JSON.parse(v) as { foo?: string },
		}),
		secondParam: PathParam<{ foo: string | undefined }>({
			rehydrate: (v) => JSON.parse(v),
		}),
	})
})

router.get('/test/89d961f1-7d36-4271-8bd3-665ee0992590/:firstParam/:secondParam', (ctx) => {
	usePathParams(ctx, {
		firstParam: PathParam({
			rehydrate: (v) => JSON.parse(v) as { foo: string | number },
		}),
		secondParam: PathParam<{ foo: string | number }>({
			rehydrate: (v) => JSON.parse(v),
		}),
	})
})

router.get('/test/f89310d9-25ac-4005-93e4-614179d3bbd4', (ctx) => {
	useQueryParams(ctx, {
		firstParam: RequiredParam({
			rehydrate: (v) => v,
		}),
		secondParam: OptionalParam({
			rehydrate: (v) => v === '1',
		}),
		thirdParam: OptionalParam({
			rehydrate: (v) => Number(v),
		}),
	})
})

router.post('/test/7c51de80-1ff1-4511-b0d3-8a75c296c507', (ctx) => {
	useQueryParams(ctx, {
		foo: RequiredParam<'dec' | 'hex' | 'bin'>({
			rehydrate: (v) => v as 'dec' | 'hex' | 'bin',
		}),
	})
})

router.get('/test/724a56ef-32f9-4c59-b22c-60bd33e45242', (ctx) => {
	useQueryParams(ctx, {
		foo: RequiredParam({
			rehydrate: (v) => v as 'hello world',
		}),
	})
})

router.get('/test/2b9a53fa-4418-4303-9202-3f8e46f73aed', (ctx) => {
	useQueryParams(ctx, {
		foo: RequiredParam({
			rehydrate: (v) => v,
			description: 'Test description',
		}),
	})
})

router.get('/test/685ac7fb-18ee-4ace-b68e-a6ee354ad4db', (ctx) => {
	useQueryParams(ctx, {
		foo: RequiredParam({
			rehydrate: (v) => v,
			errorMessage: 'Test error message',
		}),
	})
})

router.get('/test/d8b07b26-5202-434c-9ff6-3fe792dad40f', (ctx) => {
	type TupleType = {
		tuple: [number, string, boolean]
	}

	useQueryParams(ctx, {
		foo: RequiredParam<TupleType>({
			rehydrate: (v) => JSON.parse(v),
		}),
	})
})

router.get('/test/03c247cb-96c0-4748-bb6a-9569c7bdb436', (ctx) => {
	useHeaderParams(ctx, {
		firstParam: RequiredParam({
			rehydrate: (v) => v,
		}),
		secondParam: OptionalParam({
			rehydrate: (v) => v === '1',
		}),
		thirdParam: OptionalParam({
			rehydrate: (v) => Number(v),
		}),
	})
})

router.get('/test/e563aa37-803e-4b79-a3e8-af0d01d024ae', (ctx) => {
	useHeaderParams(ctx, {
		'header-with-dashes': RequiredParam({
			rehydrate: (v) => v,
		}),
	})
})

router.get('/test/a3e79aaa-2d0f-4481-9226-a10904e76354', (ctx) => {
	useHeaderParams(ctx, {
		foo: RequiredParam({
			rehydrate: (v) => v,
			description: 'Test description',
		}),
	})
})

router.get('/test/219c5c4e-1558-4d0b-85be-9753dfc14083', (ctx) => {
	useHeaderParams(ctx, {
		foo: RequiredParam({
			rehydrate: (v) => v,
			errorMessage: 'Test error message',
		}),
	})
})

router.get('/test/1ea8bc2f-3f66-4409-ba4a-289f33bcc8fd', (ctx) => {
	useHeaderParams(ctx, {
		foo: StringValidator,
	})
})

router.get('/test/c679c01e-a403-4a5c-8097-3abbe891a625', (ctx) => {
	useHeaderParams(ctx, {
		foo: RequiredParam(StringValidator),
	})
})

router.get('/test/6040cd01-a0c6-4b70-9901-b647f19b19a7', (ctx) => {
	useRequestRawBody(
		ctx,
		RequiredParam<{ foo: string; bar?: number }>({
			rehydrate: (v) => JSON.parse(v),
		})
	)
})

router.get('/test/f3754325-6d9c-42b6-becf-4a9e72bd2c4e', (ctx) => {
	useRequestRawBody(
		ctx,
		RequiredParam({
			rehydrate: (v) => JSON.parse(v) as { foo: string; bar?: number },
		})
	)
})

router.get('/test/1ab973ff-9937-4e2d-b432-ff43a9df42cb', (ctx) => {
	useRequestRawBody(
		ctx,
		OptionalParam({
			rehydrate: (v) => JSON.parse(v) as { foo: string; bar?: number },
		})
	)
})

router.get('/test/f74f6003-2aba-4f8c-855e-c0149f4217b7', (ctx) => {
	useRequestRawBody(ctx, OptionalParam(BooleanValidator))
})

router.get('/test/54768e53-4094-4e2e-96bf-8891235f264b', (ctx) => {
	useRequestRawBody(
		ctx,
		RequiredParam({
			rehydrate: (v) => v,
			description: 'Test description',
			errorMessage: 'Test error message',
		})
	)
})

router.get('/test/87a1470c-3fec-492a-bc4c-ff35fc95524a', (ctx) => {
	useRequestRawBody(
		ctx,
		RequiredParam({
			rehydrate: (v) => v,
			description: 'Test description',
			errorMessage: 'Test error message',
		})
	)
})

router.get('/test/32f51057-743a-4c37-9647-476f9a8581f3', (ctx) => {
	useRequestRawBody(ctx, StringValidator)
})

router.get('/test/2fbc419b-2f1c-4782-9113-ef4125dd813b', (ctx) => {
	useRequestRawBody(ctx, OptionalParam(StringValidator))
})

router.get('/test/e8e5496b-11a0-41e3-a68d-f03d524e413c', (ctx) => {
	useRequestBody(ctx, {
		firstParam: RequiredParam({
			rehydrate: (v) => v,
		}),
		secondParam: OptionalParam({
			rehydrate: (v) => v === '1',
		}),
		thirdParam: OptionalParam({
			rehydrate: (v) => Number(v),
		}),
	})
})

router.get('/test/c9a2301c-babd-4512-935c-b9664803e720', (ctx) => {
	useRequestBody(ctx, {
		firstParam: OptionalParam(StringValidator),
	})
})

router.get('/test/b3b9aec9-f58e-4c4b-8cf6-ca2fe11c5331', (ctx) => {
	useRequestBody(ctx, {
		firstParam: RequiredParam(BigIntValidator),
	})
})

router.get('/test/e1bedf55-6d3a-4c01-9c66-6ec74cc66c3b', () => {
	return 'Hello world'
})

router.get('/test/78ad5fba-f4e2-4924-b28a-23e39dd146f7', () => {
	const random = Math.random()
	if (random < 0.33) {
		return 100 as number
	} else if (random < 0.67) {
		return true
	} else {
		return 'Hello world' as string
	}
})

router.get('/test/c542cb10-538c-44eb-8d13-5111e273ead0', () => {
	return {
		foo: 'test',
		bar: 12,
	}
})

router.get('/test/03888127-6b97-42df-b429-87a6588ab2a4', () => {
	return {} as {
		foo: string | undefined
		bar?: number
	}
})

router.get('/test/b73347dc-c16f-4272-95b4-bf1716bf9c14', () => {
	return {
		foo: 123,
	} as {
		foo: string | number | boolean
	}
})

router.get('/test/666b9ed1-62db-447a-80a7-8f35ec50ab02', async () => {
	return {
		foo: 123,
	}
})

router.get('/test/97bb5db8-1871-4c1d-998e-a724c04c5741', (ctx) => {
	const query = useQueryParams(ctx, {
		firstParam: RequiredParam({
			rehydrate: (v) => v,
		}),
		secondParam: OptionalParam({
			rehydrate: (v) => v === '1',
		}),
		thirdParam: OptionalParam({
			rehydrate: (v) => Number(v),
		}),
	})

	return {
		foo: query.firstParam,
		bar: query.secondParam,
		baz: query.thirdParam,
	}
})

router.get('/test/4188ebf2-eae6-4994-8732-c7f43d4da861', (ctx) => {
	const query = useQueryParams(ctx, {
		firstParam: RequiredParam({
			rehydrate: (v) => v,
		}),
		secondParam: OptionalParam({
			rehydrate: (v) => v === '1',
		}),
		thirdParam: OptionalParam({
			rehydrate: (v) => Number(v),
		}),
	})

	if (Math.random() > 0.5) {
		return {
			test: 'value',
		}
	}

	return {
		foo: query.firstParam,
		bar: query.secondParam,
		baz: query.thirdParam,
	}
})

router.get('/test/32f18a25-2408-46cf-9519-f9a8d855bf84', () => {
	return {} as Record<string, { foo: string; bar: string }>
})

router.get('/test/196f2937-e369-435f-b239-62eaacaa6fbd', () => {
	/* Empty */
})

router.post('/test/33a0f888-396e-4c4d-b1d9-4cf6600ab88d', () => {
	type Circular = string | Circular[]
	return {} as Circular
})

router.post('/test/e3659429-1a05-4590-a5a6-dc80a30878e6', () => {
	return ['foo', 'bar']
})

router.get('/test/9470a1f7-1781-43ea-aa32-4d7d71eddf4f', () => {
	return 0 as unknown as { foo: string } & { bar: string }
})

router.get('/test/be7205a2-3bc3-490e-be25-988d7ab65f20', () => {
	return 0 as unknown as ({ afoo: string } | { abar: string }) & ({ befoo: string } | { beebar: string })
})

router.get('/test/006b4d53-15a4-405e-b94d-1fa3abbd19aa', () => {
	return '' as string | null
})

router.get('/test/a8f4e5f7-ed58-4de6-8877-b14bf14ae176', () => {
	return '' as string | number | null
})

router.get('/test/b9fae12a-be41-4aef-9250-f6d67cd0aee6', () => {
	return {} as { foo: string | null }
})

router.get('/test/dba70b93-8e8f-4731-8869-285831d18fcb', () => {
	return {} as { foo: Date }
})

router.get('/test/79207cfa-916a-4474-9d98-45196d2451b5', () => {
	return {} as { foo: bigint }
})

router.get('/test/19207cfa-916a-4474-9d98-45196d2451b6', () => {
	return { foo: BigInt(2) }
})

router.get('/test/66a075bc-c9d4-4622-8c04-e0a982a19fb0', (ctx) => {
	type AnotherNamedParam = {
		aaa: string
		bbb: number
		ccc: boolean
	}

	type NamedParam = {
		firstVal: string
		secondVal: AnotherNamedParam
	}

	useQueryParams(ctx, {
		foo: RequiredParam({
			rehydrate: (v) => JSON.parse(v) as NamedParam,
		}),
	})
})

router.get('/test/39669151-c529-4bcd-86a5-a10de7834104/:foo', (ctx) => {
	const { foo } = usePathParams(ctx, {
		foo: RequiredParam({
			rehydrate: (v) => v,
		}),
	})
	foo
})

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

router.get('/test/e917e982-b5ce-4a8f-804e-13466e7a00a2', (ctx) => {
	useQueryParams(ctx, {
		foo: RequiredParam({
			rehydrate: (v) => JSON.parse(v) as FooBarObject,
		}),
	})
})

router.get('/test/af22e5ff-7cbf-4aa3-8ea9-fd538a747c01', (ctx) => {
	useQueryParams(ctx, {
		foo: RequiredParam<FooBarObject>({
			rehydrate: (v) => JSON.parse(v),
		}),
	})
})

router.get('/test/e349c3c6-990b-4d97-9bde-f3bf133d2df7/:id', () => {
	/* Empty */
})

router.post('/test/e349c3c6-990b-4d97-9bde-f3bf133d2df7/:id', () => {
	/* Empty */
})

router.patch('/test/e349c3c6-990b-4d97-9bde-f3bf133d2df7/:id', () => {
	/* Empty */
})

router.delete('/test/e349c3c6-990b-4d97-9bde-f3bf133d2df7/:id', () => {
	/* Empty */
})
