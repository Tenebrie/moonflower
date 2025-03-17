import assert from 'assert'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { SourceFile } from 'ts-morph'

import { Logger } from '../../utils/logger'
import { EndpointData } from '../types'

// Bump in case of breaking changes
const CACHE_VERSION = 1

export const SourceFileCache = {
	getCachedResults: (file: SourceFile, timestamp: number, cachePath: string) => {
		const fileName = file.getFilePath().split('/').pop()
		// Create a simple hash of the file path
		const fileNameHash = crypto.createHash('md5').update(file.getFilePath()).digest('hex')

		const cacheFilePath = path.join(cachePath, `${fileNameHash}.json`)

		if (!fs.existsSync(cacheFilePath)) {
			Logger.debug(`[${fileName}] No cached results`)
			return
		}

		try {
			const cacheFile = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8')) as {
				version: number
				timestamp: string
				endpoints: EndpointData[]
			}

			if (
				!('version' in cacheFile) ||
				!('timestamp' in cacheFile) ||
				!('endpoints' in cacheFile) ||
				typeof cacheFile.version !== 'number' ||
				typeof cacheFile.timestamp !== 'number' ||
				!Array.isArray(cacheFile.endpoints) ||
				cacheFile.endpoints.length === 0
			) {
				Logger.debug(`[${fileName}] No cached results`)
				return
			}

			if (cacheFile.version !== CACHE_VERSION) {
				Logger.debug(`[${fileName}] Cache version mismatch`)
				return
			}

			if (cacheFile.timestamp < timestamp) {
				Logger.debug(`[${fileName}] Cache timestamp mismatch`)
				return
			}

			const endpoints = cacheFile.endpoints as EndpointData[]
			assert(endpoints[0].path)
			assert(endpoints[0].method)

			return { endpoints }
		} catch (error) {
			Logger.error(`[${fileName}] Error parsing cache file`, error)
			SourceFileCache.purgeCache(cacheFilePath)
			return
		}
	},

	cacheResults: (file: SourceFile, timestamp: number, cachePath: string, endpoints: EndpointData[]) => {
		const fileNameHash = crypto.createHash('md5').update(file.getFilePath()).digest('hex')

		const cacheFilePath = path.join(cachePath, `${fileNameHash}.json`)

		fs.mkdirSync(cachePath, { recursive: true })
		fs.writeFileSync(cacheFilePath, JSON.stringify({ version: CACHE_VERSION, timestamp, endpoints }))
	},

	purgeCache: (cacheFilePath: string) => {
		try {
			fs.unlinkSync(cacheFilePath)
		} catch (error) {
			Logger.error(`Unable to remove cache file at ${cacheFilePath}`, error)
		}
	},
}
