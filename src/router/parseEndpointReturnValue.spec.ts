import { parseEndpointReturnValue } from './parseEndpointReturnValue'

describe('parseEndpointReturnValue', () => {
	it('returns string as plain text data', () => {
		const value = 'foo'
		expect(parseEndpointReturnValue(value)).toEqual({
			value,
			contentType: 'text/plain',
		})
	})

	it('returns Buffer as raw data', () => {
		const value = Buffer.from('foo')
		expect(parseEndpointReturnValue(value)).toEqual({
			value,
			contentType: 'application/octet-stream',
		})
	})

	it('transforms object into JSON', () => {
		const value = { foo: 'bar' }
		expect(parseEndpointReturnValue(value)).toEqual({
			value: JSON.stringify(value),
			contentType: 'application/json; charset=utf-8',
		})
	})

	it('keeps custom content type', () => {
		const value = {
			value: 'foo',
			contentType: 'application/custom',
		}
		expect(parseEndpointReturnValue(value)).toEqual(value)
	})
})
