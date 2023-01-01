import { mockContextPath, mockContext } from '@src/utils/mockContext'
import {
	BooleanValidator,
	NumberValidator,
	PathParam,
	RequiredParam,
	StringValidator,
	ValidationError,
} from '..'
import { usePathParams } from './usePathParams'

describe('usePathParams', () => {
	it('rehydrates params correctly', () => {
		const ctx = mockContextPath(mockContext(), '/test/:stringParam/:numberParam/:booleanParam/:objectParam', {
			stringParam: 'test_string',
			numberParam: '12',
			booleanParam: 'true',
			objectParam: '{ "foo": "aaa", "bar": "bbb" }',
		})

		const params = usePathParams(ctx, {
			stringParam: StringValidator,
			numberParam: NumberValidator,
			booleanParam: BooleanValidator,
			objectParam: RequiredParam<{ foo: string; bar: string }>({
				rehydrate: (v) => JSON.parse(v),
			}),
		})

		expect(params.stringParam).toEqual('test_string')
		expect(params.numberParam).toEqual(12)
		expect(params.booleanParam).toEqual(true)
		expect(params.objectParam).toEqual({ foo: 'aaa', bar: 'bbb' })
	})

	it('passes validation on valid parameter', () => {
		const ctx = mockContextPath(mockContext(), '/test/:testParam', {
			testParam: '12',
		})

		const params = usePathParams(ctx, {
			testParam: NumberValidator,
		})

		expect(params.testParam).toEqual(12)
	})

	it('fails validation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextPath(mockContext(), '/test/:testParam', {
				testParam: 'qwerty',
			})

			usePathParams(ctx, {
				testParam: NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed route param validation: 'testParam'")
	})

	it('passes validation when optional parameter is not provided', () => {
		const ctx = mockContextPath(mockContext(), '/test/:testParam?', {})

		const params = usePathParams(ctx, {
			testParam: NumberValidator,
		})

		expect(params.testParam).toEqual(undefined)
	})

	it('passes prevalidation on valid parameter', () => {
		const ctx = mockContextPath(mockContext(), '/test/:testParam', {
			testParam: 'valid',
		})

		const params = usePathParams(ctx, {
			testParam: PathParam({
				prevalidate: (v) => v === 'valid',
				rehydrate: (v) => v,
			}),
		})

		expect(params.testParam).toEqual('valid')
	})

	it('fails prevalidation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextPath(mockContext(), '/test/:testParam', {
				testParam: 'invalid',
			})

			usePathParams(ctx, {
				testParam: PathParam({
					prevalidate: (v) => v === 'valid',
					rehydrate: (v) => v,
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed route param validation: 'testParam'")
	})
})
