import { Router } from '../../router/Router'
import { generateOpenApiSpec } from '../generatorModule/generatorModule'
import { OpenApiManager } from '../manager/OpenApiManager'

const router = new Router({ skipOpenApiAnalysis: true })

router.get('/api-json', () => {
	return generateOpenApiSpec(OpenApiManager.getInstance())
})

export const OpenApiRouter = router
