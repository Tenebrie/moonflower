import * as fs from 'fs'

import { prepareOpenApiSpec } from '../openapi/analyzerModule/analyzerModule'
import { generateOpenApiSpec } from '../openapi/generatorModule'
import { OpenApiManager } from '../openapi/manager/OpenApiManager'
import { printAnalysisStats } from './prettyprint'

type Props = {
	targetPath: string
	tsConfigPath?: string
	force: boolean
}

export const generateSpecFile = async ({ targetPath, tsConfigPath, force }: Props) => {
	if (fs.existsSync(targetPath)) {
		if (!force && !isValidMoonflowerOutput(targetPath)) {
			console.error(
				`[Error] File already exists at ${targetPath} and does not appear to be a moonflower output. Use --force to overwrite.`,
			)
			return
		}
	}

	if (tsConfigPath && !fs.existsSync(tsConfigPath)) {
		console.error(`[Error] Unable to find a tsconfig file at ${tsConfigPath}`)
		return
	}

	await prepareOpenApiSpec({
		tsconfigPath: tsConfigPath ?? 'tsconfig.json',
	})

	const manager = OpenApiManager.getInstance()
	printAnalysisStats(manager.getStats())

	const spec = generateOpenApiSpec(manager)
	fs.writeFileSync(targetPath, JSON.stringify(spec))
}

function isValidMoonflowerOutput(filePath: string): boolean {
	try {
		const content = fs.readFileSync(filePath, 'utf-8')
		const parsed = JSON.parse(content)
		return typeof parsed === 'object' && parsed !== null && typeof parsed.openapi === 'string'
	} catch {
		return false
	}
}
