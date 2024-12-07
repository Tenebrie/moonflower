import { useReturnValue } from './useReturnValue'

describe('useReturnValue', () => {
	it('returns correct value', () => {
		const wrappedValue = useReturnValue('foo', 418, 'application/custom')
		expect(wrappedValue._isUseReturnValue).toEqual(true)
		expect(wrappedValue.value).toEqual('foo')
		expect(wrappedValue.status).toEqual(418)
		expect(wrappedValue.contentType).toEqual('application/custom')
	})

	it('returns _isUseReturnValue as the first key', () => {
		const wrappedValue = useReturnValue('foo', 418, 'application/custom')
		expect(Object.keys(wrappedValue)[0]).toEqual('_isUseReturnValue')
	})
})
