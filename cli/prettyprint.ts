import { ApiAnalysisStats } from '../src/openapi/manager/OpenApiManager'
import { Logger } from '../src/utils/logger'

export const printAnalysisStats = (stats: ApiAnalysisStats) => {
	stats.explicitRouterFiles.forEach((file) => printRouterFile(file))
	stats.discoveredRouterFiles.forEach((file) => printRouterFile(file))
}

export const printRouterFile = (file: ApiAnalysisStats['discoveredRouterFiles'][number]) => {
	Logger.info(`${file.path}`)
	file.routers.forEach((r) => {
		Logger.info(`└ ${r.name}`)
		r.endpoints.forEach((e) => {
			Logger.info(`  └ ${e}`)
		})
	})
}
