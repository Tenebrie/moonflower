import { expectTypeOf } from 'vitest'
import { describe, expect, it } from 'vitest'
import z from 'zod'

import {
	BooleanValidator,
	NullableNumberValidator,
	NumberValidator,
	OptionalParam,
	RequiredParam,
	StringValidator,
	useRequestBody,
	ValidationError,
} from '..'
import { mockContext, mockContextBody } from '../utils/mockContext'

describe('useRequestBody', () => {
	it('parses params correctly', () => {
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
				parse: (v) => JSON.parse(String(v)),
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

	it('passes validation on numeric zero parameter', () => {
		const ctx = mockContextBody(mockContext(), {
			testParam: 0,
		})

		const params = useRequestBody(ctx, {
			testParam: NumberValidator,
		})

		expect(params.testParam).toEqual(0)
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

	it('passes validation for nullable parameter', () => {
		const ctx = mockContextBody(mockContext(), {
			testParam: null,
		})

		const params = useRequestBody(ctx, {
			testParam: RequiredParam({
				parse: (v) => v,
				validate: (v) => v === null,
			}),
		})

		expect(params.testParam).toEqual(null)
	})

	it('passes validation when optional parameter is not provided', () => {
		const ctx = mockContextBody(mockContext(), {})

		const params = useRequestBody(ctx, {
			testParam: OptionalParam(NumberValidator),
		})

		expect(params.testParam).toEqual(undefined)
	})

	it('returns optional type when OptionalParam is used', () => {
		const ctx = mockContextBody(mockContext(), {})

		const params = useRequestBody(ctx, {
			testParam: OptionalParam(NumberValidator),
		})

		// TypeScript level check that type is optional
		const testValue = undefined as typeof params.testParam
		expect(testValue).toEqual(undefined)

		params.testParam = 123
	})

	it('returns nullable type when OptionalParam is used', () => {
		const ctx = mockContextBody(mockContext(), {})

		const params = useRequestBody(ctx, {
			testParam: OptionalParam(NullableNumberValidator),
		})

		// TypeScript level check that type is nullable
		const testValue = null as typeof params.testParam
		expect(testValue).toEqual(null)

		params.testParam = 123
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

	it('fails validation when no body is provided at all', () => {
		const test = () => {
			useRequestBody(mockContext(), {
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
				parse: (v) => String(v),
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
					parse: (v) => String(v),
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed body param validation: 'testParam'")
	})

	it('fails prevalidation on parse error', () => {
		const test = () => {
			const ctx = mockContextBody(mockContext(), {
				testParam: 'not a json',
			})

			useRequestBody(ctx, {
				testParam: RequiredParam<{ foo: 'aaa' }>({
					parse: (v) => JSON.parse(String(v)),
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
					parse: (v) => String(v),
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
					parse: (v) => String(v),
					description: 'Description',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed body param validation: 'testParam' (Description)")
	})

	describe('zod validators', () => {
		it('parses required params when present', () => {
			const ctx = mockContextBody(mockContext(), {
				stringParam: 'test_string',
				numberParam: '12',
				booleanParam: 'true',
				objectParam: {
					foo: 'aaa',
					bar: 'bbb',
				},
				arrayParam: [
					{
						foo: 'aaa',
						bar: 'bbb',
					},
					{
						foo: 'ccc',
						bar: 'ddd',
					},
				],
			})

			const params = useRequestBody(ctx, {
				stringParam: z.string(),
				numberParam: z.number(),
				booleanParam: z.boolean(),
				objectParam: z.object({
					foo: z.string(),
					bar: z.string(),
				}),
				arrayParam: z.array(
					z.object({
						foo: z.string(),
						bar: z.string(),
					}),
				),
			})

			expect(params.stringParam).toEqual('test_string')
			expect(params.numberParam).toEqual(12)
			expect(params.booleanParam).toEqual(true)
			expect(params.objectParam).toEqual({ foo: 'aaa', bar: 'bbb' })
			expect(params.arrayParam).toEqual([
				{ foo: 'aaa', bar: 'bbb' },
				{ foo: 'ccc', bar: 'ddd' },
			])

			expectTypeOf(params.stringParam).toEqualTypeOf<string>()
			expectTypeOf(params.numberParam).toEqualTypeOf<number>()
			expectTypeOf(params.booleanParam).toEqualTypeOf<boolean>()
			expectTypeOf(params.objectParam).toEqualTypeOf<{ foo: string; bar: string }>()
			expectTypeOf(params.arrayParam).toEqualTypeOf<{ foo: string; bar: string }[]>()
		})

		it('throws if a required param is missing', () => {
			const ctx = mockContextBody(mockContext(), {
				stringParam: 'test_string',
			})

			const test = () => {
				useRequestBody(ctx, {
					stringParam: z.string(),
					numberParam: z.number(),
				})
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow("Missing body params: 'numberParam'")
		})

		it('allows missing params when optional', () => {
			const ctx = mockContextBody(mockContext(), {
				stringParam: 'test_string',
			})

			const test = () => {
				useRequestBody(ctx, {
					stringParam: z.string(),
					numberParam: z.number().optional(),
				})
			}

			expect(test).not.toThrow(ValidationError)
		})

		it('infers the return type of optional params', () => {
			const ctx = mockContextBody(mockContext(), {})

			const params = useRequestBody(ctx, {
				numberParam: z.number().optional(),
			})

			expectTypeOf(params.numberParam).toEqualTypeOf<number | undefined>()
		})
	})
})
