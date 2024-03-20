import { analyzeSourceFileApiHeader } from '../../openapi/analyzerModule/analyzerModule'
import { loadTestData } from '../../utils/loadTestData'
import { useApiHeader } from './useApiHeader'

describe('useApiHeader', () => {
	const sourceFile = loadTestData('useApiHeader.spec.data.ts')

	it('sets header correctly', () => {
		const header = analyzeSourceFileApiHeader(sourceFile)

		expect(header).toEqual({
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

	it('does not have side effects when invoked directly', () => {
		useApiHeader({
			title: 'invalid value',
			version: 'version',
		})
	})
})
