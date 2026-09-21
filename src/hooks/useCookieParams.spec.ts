import { expectTypeOf } from 'vitest'
import { describe, expect, it } from 'vitest'
import z from 'zod'

import {
	BooleanValidator,
	NumberValidator,
	OptionalParam,
	RequiredParam,
	StringValidator,
	ValidationError,
} from '..'
import { mockContext, mockContextCookies } from '../utils/mockContext'
import { useCookieParams } from './useCookieParams'

describe('useCookieParams', () => {
	it('parses params correctly', () => {
		const ctx = mockContextCookies(mockContext(), {
			stringParam: 'test_string',
			numberParam: '12',
			booleanParam: 'true',
			objectParam: '{ "foo": "aaa", "bar": "bbb" }',
		})

		const params = useCookieParams(ctx, {
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
		const ctx = mockContextCookies(mockContext(), {
			testParam: '12',
		})

		const params = useCookieParams(ctx, {
			testParam: NumberValidator,
		})

		expect(params.testParam).toEqual(12)
	})

	it('fails validation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextCookies(mockContext(), {
				testParam: 'qwerty',
			})

			useCookieParams(ctx, {
				testParam: NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed cookie param validation: 'testParam'")
	})

	it('passes validation when optional parameter is not provided', () => {
		const ctx = mockContextCookies(mockContext(), {})

		const params = useCookieParams(ctx, {
			testParam: OptionalParam(NumberValidator),
		})

		expect(params.testParam).toEqual(undefined)
	})

	it('fails validation when required parameter is not provided', () => {
		const test = () => {
			const ctx = mockContextCookies(mockContext(), {})

			useCookieParams(ctx, {
				testParam: NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Missing cookie params: 'testParam'")
	})

	it('passes prevalidation on valid parameter', () => {
		const ctx = mockContextCookies(mockContext(), {
			testParam: 'valid',
		})

		const params = useCookieParams(ctx, {
			testParam: RequiredParam({
				prevalidate: (v) => v === 'valid',
				parse: (v) => String(v),
			}),
		})

		expect(params.testParam).toEqual('valid')
	})

	it('fails prevalidation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextCookies(mockContext(), {
				testParam: 'invalid',
			})

			useCookieParams(ctx, {
				testParam: RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed cookie param validation: 'testParam'")
	})

	it('fails prevalidation on parse error', () => {
		const test = () => {
			const ctx = mockContextCookies(mockContext(), {
				testParam: 'not a json',
			})

			useCookieParams(ctx, {
				testParam: RequiredParam<{ foo: 'aaa' }>({
					parse: (v) => JSON.parse(String(v)),
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed cookie param validation: 'testParam'")
	})

	it('sends an error message when validation fails', () => {
		const test = () => {
			const ctx = mockContextCookies(mockContext(), {
				testParam: 'invalid',
			})

			useCookieParams(ctx, {
				testParam: RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
					description: 'Description',
					errorMessage: 'Error message',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed cookie param validation: 'testParam' (Error message)")
	})

	it('sends the description when validation fails with no error message provided', () => {
		const test = () => {
			const ctx = mockContextCookies(mockContext(), {
				testParam: 'invalid',
			})

			useCookieParams(ctx, {
				testParam: RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
					description: 'Description',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed cookie param validation: 'testParam' (Description)")
	})

	describe('zod validators', () => {
		it('parses required params when present', () => {
			const ctx = mockContextCookies(mockContext(), {
				stringParam: 'test_string',
				numberParam: '12',
				booleanParam: 'true',
				objectParam: JSON.stringify({
					foo: 'aaa',
					bar: 'bbb',
				}),
			})

			const params = useCookieParams(ctx, {
				stringParam: z.string(),
				numberParam: z.number(),
				booleanParam: z.boolean(),
				objectParam: z.object({
					foo: z.string(),
					bar: z.string(),
				}),
			})

			expect(params.stringParam).toEqual('test_string')
			expect(params.numberParam).toEqual(12)
			expect(params.booleanParam).toEqual(true)
			expect(params.objectParam).toEqual({ foo: 'aaa', bar: 'bbb' })

			expectTypeOf(params.stringParam).toEqualTypeOf<string>()
			expectTypeOf(params.numberParam).toEqualTypeOf<number>()
			expectTypeOf(params.booleanParam).toEqualTypeOf<boolean>()
			expectTypeOf(params.objectParam).toEqualTypeOf<{ foo: string; bar: string }>()
		})

		it('throws if a required param is missing', () => {
			const ctx = mockContextCookies(mockContext(), {
				stringParam: 'test_string',
			})

			const test = () => {
				useCookieParams(ctx, {
					stringParam: z.string(),
					numberParam: z.number(),
				})
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow("Missing cookie params: 'numberParam'")
		})

		it('allows missing params when optional', () => {
			const ctx = mockContextCookies(mockContext(), {
				stringParam: 'test_string',
			})

			const test = () => {
				useCookieParams(ctx, {
					stringParam: z.string(),
					numberParam: z.number().optional(),
				})
			}

			expect(test).not.toThrow(ValidationError)
		})

		it('infers the return type of optional params', () => {
			const ctx = mockContextCookies(mockContext(), {})

			const params = useCookieParams(ctx, {
				numberParam: z.number().optional(),
			})

			expectTypeOf(params.numberParam).toEqualTypeOf<number | undefined>()
		})

		it('fails validation on an invalid value', () => {
			const test = () => {
				const ctx = mockContextCookies(mockContext(), {
					numberParam: 'qwerty',
				})

				useCookieParams(ctx, {
					numberParam: z.number(),
				})
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow("Failed cookie param validation: 'numberParam'")
		})

		it('applies the default value when the param is missing', () => {
			const ctx = mockContextCookies(mockContext(), {})

			const params = useCookieParams(ctx, {
				numberParam: z.number().default(12),
				stringParam: z.string().default('default_string'),
			})

			expect(params.numberParam).toEqual(12)
			expect(params.stringParam).toEqual('default_string')
		})

		it('keeps the provided value instead of the default', () => {
			const ctx = mockContextCookies(mockContext(), {
				numberParam: '7',
			})

			const params = useCookieParams(ctx, {
				numberParam: z.number().default(12),
			})

			expect(params.numberParam).toEqual(7)
		})
	})
})
