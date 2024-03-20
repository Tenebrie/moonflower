import * as fs from 'fs'
import * as path from 'path'
import { Project } from 'ts-morph'

import { discoverRouters } from '../discoverRouters/discoverRouters'

export type DiscoveredSourceFile = ReturnType<typeof discoverRouterFiles>[number]

export const discoverRouterFiles = ({
	targetPath,
	tsConfigPath,
	excludedFiles,
}: {
	targetPath: string
	tsConfigPath: string
	excludedFiles?: (string | RegExp)[]
}) => {
	if (!fs.existsSync(targetPath)) {
		return []
	}

	const usersExcludedFiles = (excludedFiles ?? []).map((value) =>
		typeof value === 'string' ? new RegExp(`${value}`) : value
	)
	const excludedPrefixes = [/^node_modules/, /^\./, /^dist/].concat(usersExcludedFiles ?? [])

	const files = fs.readdirSync(targetPath, { recursive: true }).filter((filePath): filePath is string => {
		if (typeof filePath !== 'string') {
			return false
		}

		if (excludedPrefixes.some((p) => p.test(filePath))) {
			return false
		}

		if (!filePath.endsWith('.ts')) {
			return false
		}
		return true
	})

	const project = new Project({
		tsConfigFilePath: tsConfigPath,
	})

	const routersInFiles = files
		.map((fileName) => {
			const filePath = path.resolve(targetPath, fileName)
			const sourceFile = project.getSourceFile(filePath)
			if (!sourceFile) {
				return null
			}
			const routers = discoverRouters(sourceFile)
			if (routers.named.length === 0 && routers.anonymous.length === 0) {
				return null
			}
			return {
				fileName,
				sourceFile,
				routers,
			}
		})
		.filter((file): file is NonNullable<typeof file> => file !== null)

	return routersInFiles
}
