import { Router } from '../../router/Router'
import { generateOpenApiSpec } from '../generatorModule/generatorModule'
import { OpenApiManager } from '../manager/OpenApiManager'

const router = new Router({ skipOpenApiAnalysis: true })

router.get('/api-json', () => {
	const manager = OpenApiManager.getInstance()
	const prebuilt = manager.getPrebuiltSpec()
	if (prebuilt) {
		return prebuilt
	}
	return generateOpenApiSpec(manager)
})

export const OpenApiRouter = router
