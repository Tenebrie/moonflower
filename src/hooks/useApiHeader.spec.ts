import { OpenApiManager } from '../openapi/manager/OpenApiManager'
import { useApiHeader } from './useApiHeader'

describe('useApiHeader', () => {
	it('sets header correctly', () => {
		useApiHeader({
			title: 'Test title',
			version: '1.0.0',
			description: 'Test description',
			termsOfService: 'http://example.com',
			contact: {
				name: 'QA Engineer',
				url: 'http://best-qa.com',
				email: 'admin@best-qa.com',
			},
			license: {
				name: 'MIT',
				url: 'http://best-qa.com/license',
			},
		})

		expect(OpenApiManager.getInstance().getHeader()).toEqual({
			title: 'Test title',
			version: '1.0.0',
			description: 'Test description',
			termsOfService: 'http://example.com',
			contact: {
				name: 'QA Engineer',
				url: 'http://best-qa.com',
				email: 'admin@best-qa.com',
			},
			license: {
				name: 'MIT',
				url: 'http://best-qa.com/license',
			},
		})
	})
})
