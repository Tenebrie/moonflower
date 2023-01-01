import { mockContext, mockContextQuery } from '@src/utils/mockContext'
import {
	BooleanValidator,
	NumberValidator,
	OptionalParam,
	RequiredParam,
	StringValidator,
	useQueryParams,
	ValidationError,
} from '..'

describe('useQueryParams', () => {
	it('rehydrates params correctly', () => {
		const ctx = mockContextQuery(mockContext(), {
			stringParam: 'test_string',
			numberParam: '12',
			booleanParam: 'true',
			objectParam: '{ "foo": "aaa", "bar": "bbb" }',
		})

		const params = useQueryParams(ctx, {
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
		const ctx = mockContextQuery(mockContext(), {
			testParam: '12',
		})

		const params = useQueryParams(ctx, {
			testParam: NumberValidator,
		})

		expect(params.testParam).toEqual(12)
	})

	it('fails validation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextQuery(mockContext(), {
				testParam: 'qwerty',
			})

			useQueryParams(ctx, {
				testParam: NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed query param validation: 'testParam'")
	})

	it('passes validation when optional parameter is not provided', () => {
		const ctx = mockContextQuery(mockContext(), {})

		const params = useQueryParams(ctx, {
			testParam: OptionalParam(NumberValidator),
		})

		expect(params.testParam).toEqual(undefined)
	})

	it('fails validation when required parameter is not provided', () => {
		const test = () => {
			const ctx = mockContextQuery(mockContext(), {})

			useQueryParams(ctx, {
				testParam: NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Missing query params: 'testParam'")
	})

	it('passes prevalidation on valid parameter', () => {
		const ctx = mockContextQuery(mockContext(), {
			testParam: 'valid',
		})

		const params = useQueryParams(ctx, {
			testParam: RequiredParam({
				prevalidate: (v) => v === 'valid',
				rehydrate: (v) => v,
			}),
		})

		expect(params.testParam).toEqual('valid')
	})

	it('fails prevalidation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextQuery(mockContext(), {
				testParam: 'invalid',
			})

			useQueryParams(ctx, {
				testParam: RequiredParam({
					prevalidate: (v) => v === 'valid',
					rehydrate: (v) => v,
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed query param validation: 'testParam'")
	})
})
