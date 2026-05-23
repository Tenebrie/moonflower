import fs from 'fs'
import { SourceFile, SyntaxKind } from 'ts-morph'

import { formatTimestamp, Logger } from '../../utils/logger'

export type TimestampCache = Record<string, { dependencies: SourceFile[] }>

/**
 * Per-run cache of file mtimes keyed by absolute path. Router files share large parts of their
 * transitive import graphs (common types, utils, models), so without this the same dependency gets
 * `statSync`-ed once per importing router — tens of thousands of redundant syscalls across a project
 * with dozens of routers. mtimes don't change mid-run, so memoizing is safe.
 */
export type MtimeCache = Map<string, number>

export function getSourceFileTimestamp(
	sourceFile: SourceFile,
	timestampCache: TimestampCache,
	mtimeCache: MtimeCache = new Map(),
) {
	const dependencies = getFileDependencies(sourceFile, timestampCache)
	const timestamps = dependencies.map((dep) => {
		const depPath = dep.getFilePath()
		const cached = mtimeCache.get(depPath)
		if (cached !== undefined) {
			return cached
		}
		const mtime = fs.statSync(depPath).mtimeMs
		mtimeCache.set(depPath, mtime)
		return mtime
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
	const fileName = sourceFile.getFilePath().split('/').pop()
	if (!fileName) {
		return []
	}

	const cacheHit = timestampCache[sourceFile.getFilePath()]
	if (cacheHit) {
		return cacheHit.dependencies
	}

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
