import * as fs from 'fs'
import * as path from 'path'
import yargs, { ArgumentsCamelCase } from 'yargs'
import { hideBin } from 'yargs/helpers'

import { prepareOpenApiSpec } from '../openapi/analyzerModule/analyzerModule'
import { generateOpenApiSpec } from '../openapi/generatorModule'
import { OpenApiManager } from '../openapi/manager/OpenApiManager'
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

			force: {
				describe: 'Overwrite existing file',
				type: 'boolean',
				default: false,
			},
		},

		handler(argv: ArgumentsCamelCase<{ targetPath: string; tsConfigPath?: string; force: boolean }>) {
			if (fs.existsSync(argv.targetPath)) {
				if (!argv.force && !isValidMoonflowerOutput(argv.targetPath)) {
					console.error(
						`[Error] File already exists at ${argv.targetPath} and does not appear to be a moonflower output. Use --force to overwrite.`,
					)
					return
				}
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

function isValidMoonflowerOutput(filePath: string): boolean {
	try {
		const content = fs.readFileSync(filePath, 'utf-8')
		const parsed = JSON.parse(content)
		return typeof parsed === 'object' && parsed !== null && typeof parsed.openapi === 'string'
	} catch {
		return false
	}
}
