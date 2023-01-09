import {
	BooleanValidator,
	NumberValidator,
	OptionalParam,
	RequiredParam,
	StringValidator,
	useRequestBody,
	ValidationError,
} from '..'
import { mockContext, mockContextBody } from '../utils/mockContext'

describe('useRequestBody', () => {
	it('rehydrates params correctly', () => {
		const ctx = mockContextBody(mockContext(), {
			stringParam: 'test_string',
			numberParam: '12',
			booleanParam: 'true',
			objectParam: {
				foo: 'aaa',
				bar: 'bbb',
			},
		})

		const params = useRequestBody(ctx, {
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
		const ctx = mockContextBody(mockContext(), {
			testParam: '12',
		})

		const params = useRequestBody(ctx, {
			testParam: NumberValidator,
		})

		expect(params.testParam).toEqual(12)
	})

	it('fails validation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextBody(mockContext(), {
				testParam: 'qwerty',
			})

			useRequestBody(ctx, {
				testParam: NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed body param validation: 'testParam'")
	})

	it('passes validation when optional parameter is not provided', () => {
		const ctx = mockContextBody(mockContext(), {})

		const params = useRequestBody(ctx, {
			testParam: OptionalParam(NumberValidator),
		})

		expect(params.testParam).toEqual(undefined)
	})

	it('fails validation when required parameter is not provided', () => {
		const test = () => {
			const ctx = mockContextBody(mockContext(), {})

			useRequestBody(ctx, {
				testParam: NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Missing body params: 'testParam'")
	})

	it('passes prevalidation on valid parameter', () => {
		const ctx = mockContextBody(mockContext(), {
			testParam: 'valid',
		})

		const params = useRequestBody(ctx, {
			testParam: RequiredParam({
				prevalidate: (v) => v === 'valid',
				rehydrate: (v) => v,
			}),
		})

		expect(params.testParam).toEqual('valid')
	})

	it('fails prevalidation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextBody(mockContext(), {
				testParam: 'invalid',
			})

			useRequestBody(ctx, {
				testParam: RequiredParam({
					prevalidate: (v) => v === 'valid',
					rehydrate: (v) => v,
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed body param validation: 'testParam'")
	})

	it('fails prevalidation on rehydrate error', () => {
		const test = () => {
			const ctx = mockContextBody(mockContext(), {
				testParam: 'not a json',
			})

			useRequestBody(ctx, {
				testParam: RequiredParam<{ foo: 'aaa' }>({
					rehydrate: (v) => JSON.parse(v),
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed body param validation: 'testParam'")
	})

	it('sends an error message when validation fails', () => {
		const test = () => {
			const ctx = mockContextBody(mockContext(), {
				testParam: 'invalid',
			})

			useRequestBody(ctx, {
				testParam: RequiredParam({
					prevalidate: (v) => v === 'valid',
					rehydrate: (v) => v,
					description: 'Description',
					errorMessage: 'Error message',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed body param validation: 'testParam' (Error message)")
	})

	it('sends the description when validation fails with no error message provided', () => {
		const test = () => {
			const ctx = mockContextBody(mockContext(), {
				testParam: 'invalid',
			})

			useRequestBody(ctx, {
				testParam: RequiredParam({
					prevalidate: (v) => v === 'valid',
					rehydrate: (v) => v,
					description: 'Description',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed body param validation: 'testParam' (Description)")
	})
})
