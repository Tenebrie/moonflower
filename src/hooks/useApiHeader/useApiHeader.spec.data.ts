import { useApiHeader } from './useApiHeader'

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

useApiHeader({
	title: '12',
	version: '123',
})
