import { Project } from 'ts-morph'
import * as util from 'util'
import { vi } from 'vitest'

import { debugNode, debugNodeChildren, debugNodes, debugObject } from './printers'

describe('printer utilities', () => {
	const consoleMock = vi.fn()

	beforeEach(() => {
		consoleMock.mockClear()
		console.debug = consoleMock
	})

	describe('debugNode', () => {
		it('handles undefined node', () => {
			debugNode(undefined)
			expect(consoleMock).toHaveBeenCalledWith('Node is undefined')
		})

		it('handles simple node', () => {
			const project = new Project({
				useInMemoryFileSystem: true,
			})
			const sourceFile = project.createSourceFile(
				'/test-file',
				`
				type Foo = string
				`,
			)

			debugNode(sourceFile.getFirstChild())
			expect(consoleMock).toHaveBeenCalledWith([{ kind: 'TypeAliasDeclaration', text: 'type Foo = string' }])
		})
	})

	describe('debugNodes', () => {
		it('handles undefined node', () => {
			debugNodes(undefined)
			expect(consoleMock).toHaveBeenCalledWith('Nodes are undefined')
		})

		it('handles simple node', () => {
			const project = new Project({
				useInMemoryFileSystem: true,
			})
			const sourceFile = project.createSourceFile(
				'/test-file',
				`
				type Foo = string
				`,
			)

			debugNodes(sourceFile.getChildren())
			expect(consoleMock).toHaveBeenCalledWith([{ kind: 'TypeAliasDeclaration', text: 'type Foo = string' }])
		})
	})

	describe('debugNodeChildren', () => {
		it('handles undefined node', () => {
			debugNodeChildren(undefined)
			expect(consoleMock).toHaveBeenCalledWith('Node is undefined')
		})

		it('handles simple node', () => {
			const project = new Project({
				useInMemoryFileSystem: true,
			})
			const sourceFile = project.createSourceFile(
				'/test-file',
				`
				type Foo = string
				`,
			)

			debugNodeChildren(sourceFile.getFirstChild())
			expect(consoleMock).toHaveBeenCalledWith([{ kind: 'TypeAliasDeclaration', text: 'type Foo = string' }])
		})
	})

	describe('debugObject', () => {
		it('prints non-object correctly', () => {
			debugObject('test')
			expect(consoleMock).toHaveBeenCalledWith('test')
		})

		it('prints object correctly', () => {
			debugObject({
				q1: 'qqq',
				q2: 'www',
			})
			expect(consoleMock).toHaveBeenCalledWith(
				util.inspect(
					{
						q1: 'qqq',
						q2: 'www',
					},
					{ showHidden: false, depth: null, colors: true },
				),
			)
		})
	})
})
