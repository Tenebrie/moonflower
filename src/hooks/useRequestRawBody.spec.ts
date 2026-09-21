import { expectTypeOf } from 'vitest'
import { describe, expect, it } from 'vitest'
import z from 'zod'

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

	describe('zod validators', () => {
		it('parses a number raw body', () => {
			const ctx = mockContextRawBody(mockContext(), '12')

			const rawBody = useRequestRawBody(ctx, z.number())

			expect(rawBody).toEqual(12)
			expectTypeOf(rawBody).toEqualTypeOf<number>()
		})

		it('parses a string raw body', () => {
			const ctx = mockContextRawBody(mockContext(), 'test_string')

			const rawBody = useRequestRawBody(ctx, z.string())

			expect(rawBody).toEqual('test_string')
			expectTypeOf(rawBody).toEqualTypeOf<string>()
		})

		it('keeps a string raw body that happens to be valid JSON', () => {
			for (const value of ['123', 'true', 'null', '[1,2]']) {
				const ctx = mockContextRawBody(mockContext(), value)

				expect(useRequestRawBody(ctx, z.string())).toEqual(value)
			}
		})

		it('parses an object raw body', () => {
			const ctx = mockContextRawBody(mockContext(), JSON.stringify({ foo: 'aaa', bar: 'bbb' }))

			const rawBody = useRequestRawBody(
				ctx,
				z.object({
					foo: z.string(),
					bar: z.string(),
				}),
			)

			expect(rawBody).toEqual({ foo: 'aaa', bar: 'bbb' })
			expectTypeOf(rawBody).toEqualTypeOf<{ foo: string; bar: string }>()
		})

		it('fails validation on an invalid raw body', () => {
			const test = () => {
				const ctx = mockContextRawBody(mockContext(), 'not a number')

				useRequestRawBody(ctx, z.number())
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow('Failed request body validation.')
		})

		it('fails validation when a required raw body is not provided', () => {
			const test = () => {
				useRequestRawBody(mockContext(), z.number())
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow('Missing request body.')
		})

		it('passes validation when an optional raw body is not provided', () => {
			const rawBody = useRequestRawBody(mockContext(), z.number().optional())

			expect(rawBody).toEqual(undefined)
			expectTypeOf(rawBody).toEqualTypeOf<number | undefined>()
		})

		it('applies the default value when the raw body is not provided', () => {
			const rawBody = useRequestRawBody(mockContext(), z.number().default(12))

			expect(rawBody).toEqual(12)
			expectTypeOf(rawBody).toEqualTypeOf<number>()
		})

		it('keeps the provided value instead of the default', () => {
			const ctx = mockContextRawBody(mockContext(), '7')

			const rawBody = useRequestRawBody(ctx, z.number().default(12))

			expect(rawBody).toEqual(7)
		})

		it('sends the description when validation fails', () => {
			const test = () => {
				const ctx = mockContextRawBody(mockContext(), 'not a number')

				useRequestRawBody(ctx, z.number().describe('Any numeric value'))
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow('Failed request body validation (Any numeric value).')
		})

		it('sends the description when a required raw body is not provided', () => {
			const test = () => {
				useRequestRawBody(mockContext(), z.number().describe('Any numeric value'))
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow('Missing request body (Any numeric value).')
		})
	})
})
