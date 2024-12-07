import { useReturnValue } from '../hooks/useReturnValue'
import { parseEndpointReturnValue } from './parseEndpointReturnValue'

describe('parseEndpointReturnValue', () => {
	it('returns string as plain text data', () => {
		const value = 'foo'
		expect(parseEndpointReturnValue(value)).toEqual({
			value,
			status: 'unset',
			contentType: 'text/plain',
		})
	})

	it('returns number as plain text data', () => {
		const value = 100
		expect(parseEndpointReturnValue(value)).toEqual({
			value: '100',
			status: 'unset',
			contentType: 'text/plain',
		})
	})

	it('returns Buffer as raw data', () => {
		const value = Buffer.from('foo')
		expect(parseEndpointReturnValue(value)).toEqual({
			value,
			status: 'unset',
			contentType: 'application/octet-stream',
		})
	})

	it('transforms object into JSON', () => {
		const value = { foo: 'bar' }
		expect(parseEndpointReturnValue(value)).toEqual({
			value: JSON.stringify(value),
			status: 'unset',
			contentType: 'application/json; charset=utf-8',
		})
	})

	it('parses useReturnValue with string value correctly', () => {
		const value: ReturnType<typeof useReturnValue> = {
			_isUseReturnValue: true,
			value: 'foo',
			status: 418,
			contentType: 'application/custom',
		}
		expect(parseEndpointReturnValue(value)).toEqual({
			value: 'foo',
			status: 418,
			contentType: 'application/custom',
		})
	})

	it('parses useReturnValue with number value correctly', () => {
		const value: ReturnType<typeof useReturnValue> = {
			_isUseReturnValue: true,
			value: 100,
			status: 418,
			contentType: 'application/custom',
		}
		expect(parseEndpointReturnValue(value)).toEqual({
			value: '100',
			status: 418,
			contentType: 'application/custom',
		})
	})

	it('parses useReturnValue with Buffer value correctly', () => {
		const value: ReturnType<typeof useReturnValue> = {
			_isUseReturnValue: true,
			value: Buffer.from('foo'),
			status: 418,
			contentType: 'application/custom',
		}
		expect(parseEndpointReturnValue(value)).toEqual({
			value: Buffer.from('foo'),
			status: 418,
			contentType: 'application/custom',
		})
	})
})
