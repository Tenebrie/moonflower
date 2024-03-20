import { resolve } from 'path'

import { discoverRouterFiles } from './discoverRouterFiles'

describe('discoverRouterFiles', () => {
	it('discovers routers from folder correctly', () => {
		const files = discoverRouterFiles({
			targetPath: resolve(__dirname, '.'),
			tsConfigPath: resolve('./tsconfig.json'),
		})

		expect(files.length).toEqual(2)
	})

	it('respects ignoring files by string', () => {
		const files = discoverRouterFiles({
			targetPath: resolve(__dirname, '.'),
			tsConfigPath: resolve('./tsconfig.json'),
			excludedFiles: ['testRouterA'],
		})

		expect(files.length).toEqual(1)
		expect(files[0].fileName.endsWith('testRouterB.spec.data.ts')).toBeTruthy()
	})

	it('respects ignoring files by regex', () => {
		const files = discoverRouterFiles({
			targetPath: resolve(__dirname, '.'),
			tsConfigPath: resolve('./tsconfig.json'),
			excludedFiles: [/B/g],
		})

		expect(files.length).toEqual(1)
		expect(files[0].fileName.endsWith('testRouterA.spec.data.ts')).toBeTruthy()
	})
})
