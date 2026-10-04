import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

import { generateSpecFile } from './generateSpecFile'

describe('generateSpecFile', () => {
	it('writes the analyzed endpoints into the target file', async () => {
		const targetPath = path.join(os.tmpdir(), `moonflower-cli-spec-${Date.now()}.json`)

		try {
			await generateSpecFile({ targetPath, force: false })

			const spec = JSON.parse(fs.readFileSync(targetPath, 'utf-8'))
			expect(spec.paths['/test/hello']).toBeDefined()
		} finally {
			fs.unlinkSync(targetPath)
		}
	}, 60_000)
})
