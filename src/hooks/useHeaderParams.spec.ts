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
})
