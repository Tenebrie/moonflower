import * as fs from 'fs'
import * as path from 'path'
import yargs, { ArgumentsCamelCase } from 'yargs'
import { hideBin } from 'yargs/helpers'

import { prepareOpenApiSpec } from '../src/openapi/analyzerModule/analyzerModule'
import { generateOpenApiSpec } from '../src/openapi/generatorModule'
import { OpenApiManager } from '../src/openapi/manager/OpenApiManager'
import { printAnalysisStats } from './prettyprint'

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
		},

		handler(argv: ArgumentsCamelCase<{ targetPath: string; tsConfigPath?: string }>) {
			if (fs.existsSync(argv.targetPath)) {
				console.error(`[Error] File already exists at ${argv.targetPath}`)
				return
			}

			if (argv.tsConfigPath && !fs.existsSync(argv.tsConfigPath)) {
				console.error(`[Error] Unable to find a tsconfig file at ${argv.tsConfigPath}`)
				return
			}

			prepareOpenApiSpec({
				tsconfigPath: argv.tsConfigPath ?? 'tsconfig.json',
			})

			const manager = OpenApiManager.getInstance()
			printAnalysisStats(manager.getStats())

			const spec = generateOpenApiSpec(manager)
			fs.writeFileSync(argv.targetPath, JSON.stringify(spec))
		},
	})
	.demandCommand()
	.parse()
