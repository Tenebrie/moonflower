import { useApiEndpoint } from './useApiEndpoint'

describe('useApiEndpoint', () => {
	it('does not do anything', () => {
		useApiEndpoint({
			name: 'Test name',
			summary: 'Test summary',
			description: 'Test description',
		})
	})
})
