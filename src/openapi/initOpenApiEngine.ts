import * as fs from 'fs'
import Koa from 'koa'

import type * as AnalyzerModule from './analyzerModule/analyzerModule'
import { OpenApiManager } from './manager/OpenApiManager'
import { OpenApiRouter } from './router/OpenApiRouter'

type AnalyzerProps = Parameters<typeof AnalyzerModule.prepareOpenApiSpec>[0]

type PrebuiltSpecProps = {
	/**
	 * Path to a pre-built OpenAPI spec JSON file.
	 * When provided, the analyzer is skipped entirely and the spec is served from this file.
	 * Use this in production to avoid running the TypeScript analyzer on startup.
	 *
	 * Generate the spec file at build time using the CLI:
	 * ```
	 * moonflower openapi ./openapi-spec.json
	 * ```
	 */
	specPath: string
}

/**
 * Middleware to initialize the openApi engine.
 * Can be at any position in the middleware execution order.
 *
 * In development, pass analyzer options to generate the spec on startup:
 * ```
 * initOpenApiEngine({ tsconfigPath: 'tsconfig.json', sourceFileDiscovery: true })
 * ```
 *
 * In production, pass a pre-built spec file to skip analysis:
 * ```
 * initOpenApiEngine({ specPath: './openapi-spec.json' })
 * ```
 */
export const initOpenApiEngine = (props: AnalyzerProps | PrebuiltSpecProps) => {
	const ready =
		'specPath' in props
			? loadPrebuiltSpec(props.specPath)
			: import('./analyzerModule/analyzerModule').then(({ prepareOpenApiSpec }) => prepareOpenApiSpec(props))

	const builtInRoutes = OpenApiRouter.routes()
	const builtInAllowedMethods = OpenApiRouter.allowedMethods()
	return async (ctx: Koa.ParameterizedContext<any, any>, next: Koa.Next) => {
		await ready
		return builtInRoutes(ctx, () => builtInAllowedMethods(ctx, next))
	}
}

const loadPrebuiltSpec = (specPath: string) => {
	const manager = OpenApiManager.getInstance()
	if (manager.isReady()) {
		return
	}

	const content = fs.readFileSync(specPath, 'utf-8')
	const spec = JSON.parse(content)
	manager.setPrebuiltSpec(spec)
	manager.markAsReady()
}
