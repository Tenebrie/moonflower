import fs from 'fs'
import { SourceFile, SyntaxKind } from 'ts-morph'

import { formatTimestamp, Logger } from '../../utils/logger'

export type TimestampCache = Record<string, { dependencies: SourceFile[] }>

export function getSourceFileTimestamp(sourceFile: SourceFile, timestampCache: TimestampCache) {
	const dependencies = getFileDependencies(sourceFile, timestampCache)
	const timestamps = dependencies.map((dep) => {
		const stat = fs.statSync(dep.getFilePath())
		return stat.mtimeMs
	})
	const latestTimestamp = Math.max(...timestamps)

	const fileName = sourceFile.getFilePath().split('/').pop()
	const depsCount = dependencies.length
	Logger.debug(
		`[${fileName}] Found ${depsCount} imports, latest touched at ${formatTimestamp(latestTimestamp)}.`,
	)

	return latestTimestamp
}

function getFileDependencies(sourceFile: SourceFile, timestampCache: TimestampCache): SourceFile[] {
	const cacheHit = timestampCache[sourceFile.getFilePath()]
	if (cacheHit) {
		return cacheHit.dependencies
	}

	const fileName = sourceFile.getFilePath().split('/').pop()

	// Initialize cache entry early to prevent circular dependencies
	timestampCache[sourceFile.getFilePath()] = { dependencies: [] }

	try {
		const results = [sourceFile]

		const importDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.ImportDeclaration)

		for (const declaration of importDeclarations) {
			const importedSourceFile = declaration.getModuleSpecifierSourceFile()
			if (!importedSourceFile) {
				Logger.debug(`[${fileName}] Could not resolve import ${declaration.getModuleSpecifierValue()}.`)
				continue
			}

			const deps = getFileDependencies(importedSourceFile, timestampCache)
			results.push(...deps)
		}

		timestampCache[sourceFile.getFilePath()] = { dependencies: results }
		return results
	} catch (error) {
		Logger.warn(`[${fileName}] Caught an error while processing imports:`, error)
		timestampCache[sourceFile.getFilePath()] = { dependencies: [] }
		return []
	}
}
