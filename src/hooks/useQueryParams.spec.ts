import {
	BigIntValidator,
	BooleanValidator,
	NumberValidator,
	OptionalParam,
	RequiredParam,
	StringValidator,
	useQueryParams,
	ValidationError,
} from '..'
import { mockContext, mockContextQuery } from '../utils/mockContext'

describe('useQueryParams', () => {
	it('parses params correctly', () => {
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
				parse: (v) => JSON.parse(String(v)),
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

	it('passes validation on large number', () => {
		const reallyBigNumber = `1${Array(100)
			.fill('0')
			.reduce((total, current) => total + current, '')}`
		const ctx = mockContextQuery(mockContext(), {
			testParam: reallyBigNumber,
		})

		const params = useQueryParams(ctx, {
			testParam: NumberValidator,
		})

		expect(params.testParam).toEqual(1e100)
	})

	it('fails validation on number being too large', () => {
		const test = () => {
			const reallyBigNumber = `1${Array(500)
				.fill('0')
				.reduce((total, current) => total + current, '')}`
			const ctx = mockContextQuery(mockContext(), {
				testParam: reallyBigNumber,
			})

			useQueryParams(ctx, {
				testParam: NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed query param validation: 'testParam'")
	})

	it('passes validation on very large biging', () => {
		const reallyBigNumber = `1${Array(1000)
			.fill('0')
			.reduce((total, current) => total + current, '')}`
		const ctx = mockContextQuery(mockContext(), {
			testParam: reallyBigNumber,
		})

		const params = useQueryParams(ctx, {
			testParam: BigIntValidator,
		})

		const expectedBigInt = BigInt(reallyBigNumber)
		expect(params.testParam).toEqual(expectedBigInt)
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
				parse: (v) => String(v),
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
					parse: (v) => String(v),
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed query param validation: 'testParam'")
	})

	it('fails prevalidation on parse error', () => {
		const test = () => {
			const ctx = mockContextQuery(mockContext(), {
				testParam: 'not a json',
			})

			useQueryParams(ctx, {
				testParam: RequiredParam<{ foo: 'aaa' }>({
					parse: (v) => JSON.parse(String(v)),
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed query param validation: 'testParam'")
	})

	it('sends an error message when validation fails', () => {
		const test = () => {
			const ctx = mockContextQuery(mockContext(), {
				testParam: 'invalid',
			})

			useQueryParams(ctx, {
				testParam: RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
					description: 'Description',
					errorMessage: 'Error message',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed query param validation: 'testParam' (Error message)")
	})

	it('sends the description when validation fails with no error message provided', () => {
		const test = () => {
			const ctx = mockContextQuery(mockContext(), {
				testParam: 'invalid',
			})

			useQueryParams(ctx, {
				testParam: RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
					description: 'Description',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed query param validation: 'testParam' (Description)")
	})
})
