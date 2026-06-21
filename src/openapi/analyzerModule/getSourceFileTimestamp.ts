import fs from 'fs'
import { SourceFile, ts } from 'ts-morph'

import { formatTimestamp, Logger } from '../../utils/logger'

export type TimestampCache = Record<string, { dependencies: string[] }>
export type MtimeCache = Map<string, number>

const resolutionHost: ts.ModuleResolutionHost = ts.sys
const resolutionCacheByOptions = new WeakMap<ts.CompilerOptions, ts.ModuleResolutionCache>()

const getResolutionCache = (options: ts.CompilerOptions): ts.ModuleResolutionCache => {
	let cache = resolutionCacheByOptions.get(options)
	if (!cache) {
		cache = ts.createModuleResolutionCache(ts.sys.getCurrentDirectory(), (fileName) => fileName, options)
		resolutionCacheByOptions.set(options, cache)
	}
	return cache
}

export function getSourceFileTimestamp(
	sourceFile: SourceFile,
	timestampCache: TimestampCache,
	mtimeCache: MtimeCache = new Map(),
) {
	const compilerOptions = sourceFile.getProject().getCompilerOptions()
	const dependencies = getFileDependencies(sourceFile.getFilePath(), compilerOptions, timestampCache)
	const timestamps = dependencies.map((depPath) => {
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
	Logger.debug(
		`[${fileName}] Found ${dependencies.length} imports, latest touched at ${formatTimestamp(latestTimestamp)}.`,
	)

	return latestTimestamp
}

function getFileDependencies(
	filePath: string,
	options: ts.CompilerOptions,
	timestampCache: TimestampCache,
): string[] {
	const cacheHit = timestampCache[filePath]
	if (cacheHit) {
		return cacheHit.dependencies
	}

	timestampCache[filePath] = { dependencies: [filePath] }

	const fileName = filePath.split('/').pop()
	const sourceText = ts.sys.readFile(filePath)
	if (sourceText === undefined) {
		return timestampCache[filePath].dependencies
	}

	try {
		const closure = new Set<string>([filePath])
		const { importedFiles } = ts.preProcessFile(sourceText, true, true)
		const resolutionCache = getResolutionCache(options)

		for (const imported of importedFiles) {
			const { resolvedModule } = ts.resolveModuleName(
				imported.fileName,
				filePath,
				options,
				resolutionHost,
				resolutionCache,
			)
			if (!resolvedModule) {
				Logger.debug(`[${fileName}] Could not resolve import ${imported.fileName}.`)
				continue
			}
			for (const dep of getFileDependencies(resolvedModule.resolvedFileName, options, timestampCache)) {
				closure.add(dep)
			}
		}

		const dependencies = [...closure]
		timestampCache[filePath] = { dependencies }
		return dependencies
	} catch (error) {
		Logger.warn(`[${fileName}] Caught an error while processing imports:`, error)
		timestampCache[filePath] = { dependencies: [filePath] }
		return timestampCache[filePath].dependencies
	}
}
