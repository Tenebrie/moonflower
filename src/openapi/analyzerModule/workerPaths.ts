import os from 'os'
import path from 'path'

export const TEST_WORKER_PATH = path.join(os.tmpdir(), 'moonflower-analyzerWorker.test.mjs')
