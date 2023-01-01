import {
	BooleanValidator,
	NumberValidator,
	OptionalParam,
	RequiredParam,
	StringValidator,
	useRequestHeaders,
	ValidationError,
} from '..'
import { mockContext, mockContextHeaders } from '../utils/mockContext'

describe('useRequestHeaders', () => {
	it('rehydrates params correctly', () => {
		const ctx = mockContextHeaders(mockContext(), {
			'string-header': 'test_string',
			'number-header': '12',
			'boolean-header': 'true',
			'object-header': '{ "foo": "aaa", "bar": "bbb" }',
		})

		const params = useRequestHeaders(ctx, {
			'string-header': StringValidator,
			'number-header': NumberValidator,
			'boolean-header': BooleanValidator,
			'object-header': RequiredParam<{ foo: string; bar: string }>({
				rehydrate: (v) => JSON.parse(v),
			}),
		})

		expect(params.stringHeader).toEqual('test_string')
		expect(params.numberHeader).toEqual(12)
		expect(params.booleanHeader).toEqual(true)
		expect(params.objectHeader).toEqual({ foo: 'aaa', bar: 'bbb' })
	})

	it('rehydrates camelCase params with camelCase headers correctly', () => {
		const ctx = mockContextHeaders(mockContext(), {
			stringheader: 'test_string',
		})

		const params = useRequestHeaders(ctx, {
			stringHeader: StringValidator,
		})

		expect(params.stringHeader).toEqual('test_string')
	})

	it('passes validation on valid parameter', () => {
		const ctx = mockContextHeaders(mockContext(), {
			'test-header': '12',
		})

		const params = useRequestHeaders(ctx, {
			'test-header': NumberValidator,
		})

		expect(params.testHeader).toEqual(12)
	})

	it('fails validation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextHeaders(mockContext(), {
				'test-header': 'qwerty',
			})

			useRequestHeaders(ctx, {
				'test-header': NumberValidator,
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed header validation: 'test-header'")
	})

	it('passes validation when optional parameter is not provided', () => {
		const ctx = mockContextHeaders(mockContext(), {})

		const params = useRequestHeaders(ctx, {
			'test-header': OptionalParam(NumberValidator),
		})

		expect(params.testHeader).toEqual(undefined)
	})

	it('fails validation when required parameter is not provided', () => {
		const test = () => {
			const ctx = mockContextHeaders(mockContext(), {})

			useRequestHeaders(ctx, {
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

		const params = useRequestHeaders(ctx, {
			'test-header': RequiredParam({
				prevalidate: (v) => v === 'valid',
				rehydrate: (v) => v,
			}),
		})

		expect(params.testHeader).toEqual('valid')
	})

	it('fails prevalidation on invalid parameter', () => {
		const test = () => {
			const ctx = mockContextHeaders(mockContext(), {
				'test-header': 'invalid',
			})

			useRequestHeaders(ctx, {
				'test-header': RequiredParam({
					prevalidate: (v) => v === 'valid',
					rehydrate: (v) => v,
				}),
			})
		}

		expect(test).toThrow(ValidationError)
		expect(test).toThrow("Failed header validation: 'test-header'")
	})
})
