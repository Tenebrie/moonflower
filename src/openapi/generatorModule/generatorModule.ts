import { OpenApiManager } from '../manager/OpenApiManager'
import { generateComponentSchemas } from './generateComponentSchemas'
import { generatePaths } from './generatePaths'

export const generateOpenApiSpec = (manager: OpenApiManager) => {
	const header = manager.getHeader()
	const endpoints = manager.getEndpoints()

	return {
		openapi: '3.1.0' as const,
		info: header,
		paths: generatePaths(endpoints, manager.getPreferences()),
		components: {
			schemas: generateComponentSchemas(manager.getExposedModels()),
		},
	}
}
