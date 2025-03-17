import { NumberValidator, OptionalParam, RequiredParam, useRequestRawBody, ValidationError } from '..'
import { mockContext, mockContextBody, mockContextRawBody } from '../utils/mockContext'

describe('useRequestRawBody', () => {
	it('parses param correctly', () => {
		const ctx = mockContextBody(mockContext(), {
			foo: 'aaa',
			bar: 'bbb',
		})

		const params = useRequestRawBody(
			ctx,
			RequiredParam<{ foo: string; bar: string }>({
				parse: (v) => JSON.parse(String(v)),
			}),
		)

		expect(params.foo).toEqual('aaa')
		expect(params.bar).toEqual('bbb')
	})

	it('passes validation on valid parameter', () => {
		const ctx = mockContextRawBody(mockContext(), '12')

		const rawBody = useRequestRawBody(ctx, NumberValidator)

		expect(rawBody).toEqual(12)
	})

	it('fails validation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextRawBody(mockContext(), 'not a number')

			useRequestRawBody(ctx, NumberValidator)
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow('Failed request body validation (Must be a valid number).')
	})

	it('passes validation when optional parameter is not provided', () => {
		const params = useRequestRawBody(mockContext(), OptionalParam(NumberValidator))

		expect(params).toEqual(undefined)
	})

	it('fails validation when required parameter is not provided', () => {
		const test = () => {
			useRequestRawBody(mockContext(), NumberValidator)
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow('Missing request body (Any numeric value).')
	})

	it('fails validation for inline validator', () => {
		const test = () => {
			useRequestRawBody(
				mockContext(),
				RequiredParam({
					parse: (v) => Number(v),
					validate: (v) => !Number.isNaN(v),
				}),
			)
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow('Missing request body.')
	})

	it('passes prevalidation on valid parameter', () => {
		const ctx = mockContextRawBody(mockContext(), 'valid')

		const params = useRequestRawBody(
			ctx,
			RequiredParam({
				prevalidate: (v) => v === 'valid',
				parse: (v) => String(v),
			}),
		)

		expect(params).toEqual('valid')
	})

	it('fails prevalidation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextRawBody(mockContext(), 'invalid')

			useRequestRawBody(
				ctx,
				RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
				}),
			)
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow('Failed request body validation.')
	})

	it('fails prevalidation on parse error', () => {
		const test = () => {
			const ctx = mockContextRawBody(mockContext(), 'not a valid json')

			useRequestRawBody(
				ctx,
				RequiredParam<{ foo: 'aaa' }>({
					parse: (v) => JSON.parse(String(v)),
				}),
			)
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow('Failed request body validation.')
	})

	it('sends an error message when validation fails', () => {
		const test = () => {
			const ctx = mockContextRawBody(mockContext(), 'invalid')

			useRequestRawBody(
				ctx,
				RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
					description: 'Description',
					errorMessage: 'Error message',
				}),
			)
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow('Failed request body validation (Error message).')
	})

	it('sends the description when validation fails with no error message provided', () => {
		const test = () => {
			const ctx = mockContextRawBody(mockContext(), 'invalid')

			useRequestRawBody(
				ctx,
				RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
					description: 'Description',
				}),
			)
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow('Failed request body validation (Description).')
	})
})
