import { expectTypeOf } from 'vitest'
import { describe, expect, it } from 'vitest'
import z from 'zod'

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

	describe('zod validators', () => {
		it('parses required params when present', () => {
			const ctx = mockContextQuery(mockContext(), {
				stringParam: 'test_string',
				numberParam: '12',
				booleanParam: 'true',
				objectParam: JSON.stringify({
					foo: 'aaa',
					bar: 'bbb',
				}),
				arrayParam: JSON.stringify([
					{
						foo: 'aaa',
						bar: 'bbb',
					},
					{
						foo: 'ccc',
						bar: 'ddd',
					},
				]),
			})

			const params = useQueryParams(ctx, {
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
			const ctx = mockContextQuery(mockContext(), {
				stringParam: 'test_string',
			})

			const test = () => {
				useQueryParams(ctx, {
					stringParam: z.string(),
					numberParam: z.number(),
				})
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow("Missing query params: 'numberParam'")
		})

		it('allows missing params when optional', () => {
			const ctx = mockContextQuery(mockContext(), {
				stringParam: 'test_string',
			})

			const test = () => {
				useQueryParams(ctx, {
					stringParam: z.string(),
					numberParam: z.number().optional(),
				})
			}

			expect(test).not.toThrow(ValidationError)
		})

		it('infers the return type of optional params', () => {
			const ctx = mockContextQuery(mockContext(), {})

			const params = useQueryParams(ctx, {
				numberParam: z.number().optional(),
			})

			expectTypeOf(params.numberParam).toEqualTypeOf<number | undefined>()
		})
	})

	describe('legacy array validators', () => {
		it('parses JSON string array with legacy validator', () => {
			const ctx = mockContextQuery(mockContext(), {
				nodes: JSON.stringify(['node1', 'node2']),
			})

			const params = useQueryParams(ctx, {
				nodes: RequiredParam<string[]>({
					parse: (v) => JSON.parse(String(v)),
				}),
			})

			expect(params.nodes).toEqual(['node1', 'node2'])
		})

		it('parses comma-separated array with legacy validator', () => {
			const ctx = mockContextQuery(mockContext(), {
				nodes: 'node1,node2,node3',
			})

			const params = useQueryParams(ctx, {
				nodes: RequiredParam<string[]>({
					parse: (v) => String(v).split(','),
				}),
			})

			expect(params.nodes).toEqual(['node1', 'node2', 'node3'])
		})

		it('fails validation on invalid legacy array param', () => {
			const test = () => {
				const ctx = mockContextQuery(mockContext(), {
					nodes: 'not valid json array',
				})

				useQueryParams(ctx, {
					nodes: RequiredParam<string[]>({
						parse: (v) => JSON.parse(String(v)),
					}),
				})
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow("Failed query param validation: 'nodes'")
		})

		it('allows missing optional legacy array param', () => {
			const ctx = mockContextQuery(mockContext(), {})

			const params = useQueryParams(ctx, {
				nodes: OptionalParam<string[]>({
					parse: (v) => JSON.parse(String(v)),
				}),
			})

			expect(params.nodes).toEqual(undefined)
		})
	})

	describe('zod array validators', () => {
		it('parses JSON string array', () => {
			const ctx = mockContextQuery(mockContext(), {
				nodes: JSON.stringify(['node1', 'node2']),
			})

			const params = useQueryParams(ctx, {
				nodes: z.array(z.string()),
			})

			expect(params.nodes).toEqual(['node1', 'node2'])
		})

		it('parses JSON number array', () => {
			const ctx = mockContextQuery(mockContext(), {
				ids: JSON.stringify([1, 2, 3]),
			})

			const params = useQueryParams(ctx, {
				ids: z.array(z.number()),
			})

			expect(params.ids).toEqual([1, 2, 3])
		})

		it('parses JSON object array', () => {
			const ctx = mockContextQuery(mockContext(), {
				items: JSON.stringify([
					{ name: 'first', value: 1 },
					{ name: 'second', value: 2 },
				]),
			})

			const params = useQueryParams(ctx, {
				items: z.array(z.object({ name: z.string(), value: z.number() })),
			})

			expect(params.items).toEqual([
				{ name: 'first', value: 1 },
				{ name: 'second', value: 2 },
			])
		})

		it('parses comma-separated string array', () => {
			const ctx = mockContextQuery(mockContext(), {
				nodes: 'node1,node2,node3',
			})

			const params = useQueryParams(ctx, {
				nodes: z.array(z.string()),
			})

			expect(params.nodes).toEqual(['node1', 'node2', 'node3'])
		})

		it('parses comma-separated number array', () => {
			const ctx = mockContextQuery(mockContext(), {
				ids: '1,2,3',
			})

			const params = useQueryParams(ctx, {
				ids: z.array(z.number()),
			})

			expect(params.ids).toEqual([1, 2, 3])
		})

		it('parses comma-separated boolean array', () => {
			const ctx = mockContextQuery(mockContext(), {
				flags: 'true,false,true',
			})

			const params = useQueryParams(ctx, {
				flags: z.array(z.boolean()),
			})

			expect(params.flags).toEqual([true, false, true])
		})

		it('parses comma-separated values with whitespace', () => {
			const ctx = mockContextQuery(mockContext(), {
				nodes: 'node1, node2 , node3',
			})

			const params = useQueryParams(ctx, {
				nodes: z.array(z.string()),
			})

			expect(params.nodes).toEqual(['node1', 'node2', 'node3'])
		})

		it('parses single value as string array', () => {
			const ctx = mockContextQuery(mockContext(), {
				nodes: 'single',
			})

			const params = useQueryParams(ctx, {
				nodes: z.array(z.string()),
			})

			expect(params.nodes).toEqual(['single'])
		})

		it('parses single value as number array', () => {
			const ctx = mockContextQuery(mockContext(), {
				ids: '42',
			})

			const params = useQueryParams(ctx, {
				ids: z.array(z.number()),
			})

			expect(params.ids).toEqual([42])
		})

		it('fails validation on invalid array element', () => {
			const test = () => {
				const ctx = mockContextQuery(mockContext(), {
					ids: 'abc,def',
				})

				useQueryParams(ctx, {
					ids: z.array(z.number()),
				})
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow("Failed query param validation: 'ids'")
		})

		it('fails when required array is missing', () => {
			const test = () => {
				const ctx = mockContextQuery(mockContext(), {})

				useQueryParams(ctx, {
					nodes: z.array(z.string()),
				})
			}

			expect(test).toThrow(ValidationError)
			expect(test).toThrow("Missing query params: 'nodes'")
		})

		it('parses optional array when missing', () => {
			const ctx = mockContextQuery(mockContext(), {})

			const params = useQueryParams(ctx, {
				nodes: z.array(z.string()).optional(),
			})

			expect(params.nodes).toEqual(undefined)
		})

		it('parses optional array when present', () => {
			const ctx = mockContextQuery(mockContext(), {
				nodes: 'node1,node2',
			})

			const params = useQueryParams(ctx, {
				nodes: z.array(z.string()).optional(),
			})

			expect(params.nodes).toEqual(['node1', 'node2'])
		})

		it('infers return type of string array', () => {
			const ctx = mockContextQuery(mockContext(), {
				nodes: 'a,b',
			})

			const params = useQueryParams(ctx, {
				nodes: z.array(z.string()),
			})

			expectTypeOf(params.nodes).toEqualTypeOf<string[]>()
		})

		it('infers return type of number array', () => {
			const ctx = mockContextQuery(mockContext(), {
				ids: '1,2',
			})

			const params = useQueryParams(ctx, {
				ids: z.array(z.number()),
			})

			expectTypeOf(params.ids).toEqualTypeOf<number[]>()
		})

		it('infers return type of object array', () => {
			const ctx = mockContextQuery(mockContext(), {
				items: JSON.stringify([{ name: 'a' }]),
			})

			const params = useQueryParams(ctx, {
				items: z.array(z.object({ name: z.string() })),
			})

			expectTypeOf(params.items).toEqualTypeOf<{ name: string }[]>()
		})

		it('infers return type of optional array', () => {
			const ctx = mockContextQuery(mockContext(), {})

			const params = useQueryParams(ctx, {
				nodes: z.array(z.string()).optional(),
			})

			expectTypeOf(params.nodes).toEqualTypeOf<string[] | undefined>()
		})
	})
})
