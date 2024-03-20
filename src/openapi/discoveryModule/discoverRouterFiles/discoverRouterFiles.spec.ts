import { resolve } from 'path'

import { discoverRouterFiles } from './discoverRouterFiles'

describe('discoverRouterFiles', () => {
	it('discovers routers from folder correctly', () => {
		const { discoveredRouterFiles } = discoverRouterFiles({
			targetPath: resolve(__dirname, '.'),
			tsConfigPath: resolve('./tsconfig.json'),
		})

		expect(discoveredRouterFiles.length).toEqual(2)
	})

	it('respects ignoring files by string', () => {
		const { discoveredRouterFiles } = discoverRouterFiles({
			targetPath: resolve(__dirname, '.'),
			tsConfigPath: resolve('./tsconfig.json'),
			excludedFiles: ['testRouterA'],
		})

		expect(discoveredRouterFiles.length).toEqual(1)
		expect(discoveredRouterFiles[0].fileName.endsWith('testRouterB.spec.data.ts')).toBeTruthy()
	})

	it('respects ignoring files by regex', () => {
		const { discoveredRouterFiles } = discoverRouterFiles({
			targetPath: resolve(__dirname, '.'),
			tsConfigPath: resolve('./tsconfig.json'),
			excludedFiles: [/B/g],
		})

		expect(discoveredRouterFiles.length).toEqual(1)
		expect(discoveredRouterFiles[0].fileName.endsWith('testRouterA.spec.data.ts')).toBeTruthy()
	})
})
