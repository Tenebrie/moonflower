import { buildSync } from 'esbuild'
import { existsSync, unlinkSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workerSrc = path.join(__dirname, '..', 'analyzerWorker.ts')
const workerOut = path.join(__dirname, '..', 'analyzerWorker.test.mjs')

export function setup() {
	buildSync({
		entryPoints: [workerSrc],
		outfile: workerOut,
		bundle: true,
		format: 'esm',
		platform: 'node',
		external: ['ts-morph', '@ts-morph/common', 'typescript', 'worker_threads'],
	})
}

export function teardown() {
	if (existsSync(workerOut)) {
		unlinkSync(workerOut)
	}
}
