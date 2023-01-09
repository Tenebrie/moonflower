import {
	BooleanValidator,
	NumberValidator,
	PathParam,
	RequiredParam,
	StringValidator,
	ValidationError,
} from '..'
import { mockContext, mockContextPath } from '../utils/mockContext'
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

	it('fails prevalidation on rehydrate error', () => {
		const test = () => {
			const ctx = mockContextPath(mockContext(), '/test/:testParam', {
				testParam: 'not a json',
			})

			usePathParams(ctx, {
				testParam: PathParam<{ foo: 'aaa' }>({
					rehydrate: (v) => JSON.parse(v),
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed route param validation: 'testParam'")
	})

	it('sends an error message when validation fails', () => {
		const test = () => {
			const ctx = mockContextPath(mockContext(), '/test/:testParam', {
				testParam: 'invalid',
			})

			usePathParams(ctx, {
				testParam: PathParam({
					prevalidate: (v) => v === 'valid',
					rehydrate: (v) => v,
					description: 'Description',
					errorMessage: 'Error message',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed route param validation: 'testParam' (Error message)")
	})

	it('sends the description when validation fails with no error message provided', () => {
		const test = () => {
			const ctx = mockContextPath(mockContext(), '/test/:testParam', {
				testParam: 'invalid',
			})

			usePathParams(ctx, {
				testParam: PathParam({
					prevalidate: (v) => v === 'valid',
					rehydrate: (v) => v,
					description: 'Description',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed route param validation: 'testParam' (Description)")
	})
})
