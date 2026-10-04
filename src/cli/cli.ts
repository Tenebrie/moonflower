import * as path from 'path'
import yargs, { ArgumentsCamelCase } from 'yargs'
import { hideBin } from 'yargs/helpers'

import { generateSpecFile } from './generateSpecFile'

const originalConsole = console.info
console.info = (message, ...args) => {
	originalConsole(`${message}`, ...args)
}

yargs(hideBin(process.argv))
	.showHelpOnFail(true)
	.command({
		command: 'openapi <targetPath>',
		describe: 'Generates the current openapi spec into a specified file path',
		builder: {
			targetPath: {
				describe: 'Target path',
				demandOption: true,
				type: 'string',
				coerce: (f) => path.resolve(f),
			},

			tsConfigPath: {
				describe: 'tsconfig',
				type: 'string',
				coerce: (f) => path.resolve(f),
			},

			force: {
				describe: 'Overwrite existing file',
				type: 'boolean',
				default: false,
			},
		},

		async handler(argv: ArgumentsCamelCase<{ targetPath: string; tsConfigPath?: string; force: boolean }>) {
			await generateSpecFile(argv)
		},
	})
	.demandCommand()
	.parse()
