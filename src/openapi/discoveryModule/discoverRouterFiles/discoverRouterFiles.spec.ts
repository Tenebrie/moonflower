import { resolve } from 'path'
import { Project } from 'ts-morph'
import { beforeEach, describe, expect, it } from 'vitest'

import { discoverRouterFiles } from './discoverRouterFiles'

describe('discoverRouterFiles', () => {
	let project: Project
	beforeEach(() => {
		project = new Project({
			tsConfigFilePath: resolve('./tsconfig.json'),
			skipFileDependencyResolution: true,
		})
	})
	it('discovers routers from folder correctly', () => {
		const { discoveredRouterFiles } = discoverRouterFiles({
			targetPath: resolve(__dirname, '.'),
			project,
		})

		expect(discoveredRouterFiles.length).toEqual(2)
	})

	it('respects ignoring files by string', () => {
		const { discoveredRouterFiles } = discoverRouterFiles({
			targetPath: resolve(__dirname, '.'),
			excludedFiles: ['testRouterA'],
			project,
		})

		expect(discoveredRouterFiles.length).toEqual(1)
		expect(discoveredRouterFiles[0].fileName.endsWith('testRouterB.spec.data.ts')).toBeTruthy()
	})

	it('respects ignoring files by regex', () => {
		const { discoveredRouterFiles } = discoverRouterFiles({
			targetPath: resolve(__dirname, '.'),
			excludedFiles: [/B/g],
			project,
		})

		expect(discoveredRouterFiles.length).toEqual(1)
		expect(discoveredRouterFiles[0].fileName.endsWith('testRouterA.spec.data.ts')).toBeTruthy()
	})
})
