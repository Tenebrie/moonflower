import { expectTypeOf } from 'vitest'
import { describe, expect, it } from 'vitest'
import z from 'zod'

import {
	BooleanValidator,
	NumberValidator,
	OptionalParam,
	RequiredParam,
	StringValidator,
	useHeaderParams,
	ValidationError,
} from '..'
import { mockContext, mockContextHeaders } from '../utils/mockContext'

describe('useHeaderParams', () => {
	it('parses params correctly', () => {
		const ctx = mockContextHeaders(mockContext(), {
			'string-header': 'test_string',
			'number-header': '12',
			'boolean-header': 'true',
			'object-header': '{ "foo": "aaa", "bar": "bbb" }',
		})

		const params = useHeaderParams(ctx, {
			'string-header': StringValidator,
			'number-header': NumberValidator,
			'boolean-header': BooleanValidator,
			'object-header': RequiredParam<{ foo: string; bar: string }>({
				parse: (v) => JSON.parse(String(v)),
			}),
		})

		expect(params.stringHeader).toEqual('test_string')
		expect(params.numberHeader).toEqual(12)
		expect(params.booleanHeader).toEqual(true)
		expect(params.objectHeader).toEqual({ foo: 'aaa', bar: 'bbb' })
	})

	it('parses camelCase params with camelCase headers correctly', () => {
		const ctx = mockContextHeaders(mockContext(), {
			stringheader: 'test_string',
		})

		const params = useHeaderParams(ctx, {
			stringHeader: StringValidator,
		})

		expect(params.stringHeader).toEqual('test_string')
	})

	it('parses capital letters correctly', () => {
		const ctx = mockContextHeaders(mockContext(), {
			'session-id': 'test_string',
			'even-a-longer-name': 'test_string',
		})

		const params = useHeaderParams(ctx, {
			['Session-ID']: StringValidator,
			['Even-A-Longer-Name']: StringValidator,
		})

		expect(params.sessionID).toEqual('test_string')
		expect(params.evenALongerName).toEqual('test_string')
	})

	it('passes validation on valid parameter', () => {
		const ctx = mockContextHeaders(mockContext(), {
			'test-header': '12',
		})

		const params = useHeaderParams(ctx, {
			'test-header': NumberValidator,
		})

		expect(params.testHeader).toEqual(12)
	})

	it('fails validation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextHeaders(mockContext(), {
				'test-header': 'qwerty',
			})

			useHeaderParams(ctx, {
				'test-header': NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed header validation: 'test-header'")
	})

	it('passes validation when optional parameter is not provided', () => {
		const ctx = mockContextHeaders(mockContext(), {})

		const params = useHeaderParams(ctx, {
			'test-header': OptionalParam(NumberValidator),
		})

		expect(params.testHeader).toEqual(undefined)
	})

	it('fails validation when required parameter is not provided', () => {
		const test = () => {
			const ctx = mockContextHeaders(mockContext(), {})

			useHeaderParams(ctx, {
				'test-header': NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Missing headers: 'test-header'")
	})

	it('passes prevalidation on valid parameter', () => {
		const ctx = mockContextHeaders(mockContext(), {
			'test-header': 'valid',
		})

		const params = useHeaderParams(ctx, {
			'test-header': RequiredParam({
				prevalidate: (v) => v === 'valid',
				parse: (v) => String(v),
			}),
		})

		expect(params.testHeader).toEqual('valid')
	})

	it('fails prevalidation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextHeaders(mockContext(), {
				'test-header': 'invalid',
			})

			useHeaderParams(ctx, {
				'test-header': RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed header validation: 'test-header'")
	})

	it('fails prevalidation on parse error', () => {
		const test = () => {
			const ctx = mockContextHeaders(mockContext(), {
				'test-header': 'not a json',
			})

			useHeaderParams(ctx, {
				'test-header': RequiredParam<{ foo: 'aaa' }>({
					parse: (v) => JSON.parse(String(v)),
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed header validation: 'test-header'")
	})

	it('sends an error message when validation fails', () => {
		const test = () => {
			const ctx = mockContextHeaders(mockContext(), {
				'test-header': 'invalid',
			})

			useHeaderParams(ctx, {
				'test-header': RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
					description: 'Description',
					errorMessage: 'Error message',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed header validation: 'test-header' (Error message)")
	})

	it('sends the description when validation fails with no error message provided', () => {
		const test = () => {
			const ctx = mockContextHeaders(mockContext(), {
				'test-header': 'invalid',
			})

			useHeaderParams(ctx, {
				'test-header': RequiredParam({
					prevalidate: (v) => v === 'valid',
					parse: (v) => String(v),
					description: 'Description',
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed header validation: 'test-header' (Description)")
	})

	describe('zod validators', () => {
		it('parses required headers when present', () => {
			const ctx = mockContextHeaders(mockContext(), {
				'string-header': 'test_string',
				'number-header': '12',
				'boolean-header': 'true',
				'object-header': JSON.stringify({
					foo: 'aaa',
					bar: 'bbb',
				}),
			})

			const params = useHeaderParams(ctx, {
				'string-header': z.string(),
				'number-header': z.number(),
				'boolean-header': z.boolean(),
				'object-header': z.object({
					foo: z.string(),
					bar: z.string(),
				}),
			})

			expect(params.stringHeader).toEqual('test_string')
			expect(params.numberHeader).toEqual(12)
			expect(params.booleanHeader).toEqual(true)
			expect(params.objectHeader).toEqual({ foo: 'aaa', bar: 'bbb' })

			expectTypeOf(params.stringHeader).toEqualTypeOf<string>()
			expectTypeOf(params.numberHeader).toEqualTypeOf<number>()
			expectTypeOf(params.booleanHeader).toEqualTypeOf<boolean>()
			expectTypeOf(params.objectHeader).toEqualTypeOf<{ foo: string; bar: string }>()
		})

		it('maps kebab-case headers to camelCase keys', () => {
			const ctx = mockContextHeaders(mockContext(), {
				'session-id': 'test_string',
				'even-a-longer-name': 'test_string',
			})

			const params = useHeaderParams(ctx, {
				['Session-ID']: z.string(),
				['Even-A-Longer-Name']: z.string(),
			})

			expect(params.sessionID).toEqual('test_string')
			expect(params.evenALongerName).toEqual('test_string')
		})

		it('throws if a required header is missing', () => {
			const ctx = mockContextHeaders(mockContext(), {
				'string-header': 'test_string',
			})

			const test = () => {
				useHeaderParams(ctx, {
					'string-header': z.string(),
					'number-header': z.number(),
				})
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow("Missing headers: 'number-header'")
		})

		it('allows missing headers when optional', () => {
			const ctx = mockContextHeaders(mockContext(), {
				'string-header': 'test_string',
			})

			const test = () => {
				useHeaderParams(ctx, {
					'string-header': z.string(),
					'number-header': z.number().optional(),
				})
			}

			expect(test).not.toThrow(ValidationError)
		})

		it('infers the return type of optional headers', () => {
			const ctx = mockContextHeaders(mockContext(), {})

			const params = useHeaderParams(ctx, {
				'number-header': z.number().optional(),
			})

			expectTypeOf(params.numberHeader).toEqualTypeOf<number | undefined>()
		})

		it('fails validation on an invalid value', () => {
			const test = () => {
				const ctx = mockContextHeaders(mockContext(), {
					'number-header': 'qwerty',
				})

				useHeaderParams(ctx, {
					'number-header': z.number(),
				})
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow("Failed header validation: 'number-header'")
		})

		it('applies the default value when the header is missing', () => {
			const ctx = mockContextHeaders(mockContext(), {})

			const params = useHeaderParams(ctx, {
				'number-header': z.number().default(12),
				'string-header': z.string().default('default_string'),
			})

			expect(params.numberHeader).toEqual(12)
			expect(params.stringHeader).toEqual('default_string')
		})

		it('keeps the provided value instead of the default', () => {
			const ctx = mockContextHeaders(mockContext(), {
				'number-header': '7',
			})

			const params = useHeaderParams(ctx, {
				'number-header': z.number().default(12),
			})

			expect(params.numberHeader).toEqual(7)
		})

		it('keeps a string header that happens to be valid JSON', () => {
			const ctx = mockContextHeaders(mockContext(), {
				'numeric-header': '123',
				'boolean-header': 'true',
				'null-header': 'null',
				'array-header': '[1,2]',
			})

			const params = useHeaderParams(ctx, {
				'numeric-header': z.string(),
				'boolean-header': z.string(),
				'null-header': z.string(),
				'array-header': z.string(),
			})

			expect(params.numericHeader).toEqual('123')
			expect(params.booleanHeader).toEqual('true')
			expect(params.nullHeader).toEqual('null')
			expect(params.arrayHeader).toEqual('[1,2]')
		})
	})
})
