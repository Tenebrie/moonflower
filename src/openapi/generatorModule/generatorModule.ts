import { OpenApiManager } from '../manager/OpenApiManager'
import { generateComponentSchemas } from './generateComponentSchemas'
import { generatePaths } from './generatePaths'

export const generateOpenApiSpec = (manager: OpenApiManager) => {
	const header = manager.getHeader()
	const endpoints = manager.getEndpoints()

	return {
		openapi: '3.1.0',
		info: {
			title: header.title,
			description: header.description,
			termsOfService: header.termsOfService,
			contact: header.contact,
			license: header.license,
			version: header.version,
		},
		paths: generatePaths(endpoints, manager.getPreferences()),
		components: {
			schemas: generateComponentSchemas(manager.getExposedModels()),
		},
	}
}
