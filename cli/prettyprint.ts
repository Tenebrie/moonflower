import { ApiAnalysisStats } from '../src/openapi/manager/OpenApiManager'

export const printAnalysisStats = (stats: ApiAnalysisStats) => {
	stats.explicitRouterFiles.forEach((file) => printRouterFile(file))
	stats.discoveredRouterFiles.forEach((file) => printRouterFile(file))
}

export const printRouterFile = (file: ApiAnalysisStats['discoveredRouterFiles'][number]) => {
	console.info(`${file.path}`)
	file.routers.forEach((r) => {
		console.info(`└ ${r.name}`)
		r.endpoints.forEach((e) => {
			console.info(`  └ ${e}`)
		})
	})
}
