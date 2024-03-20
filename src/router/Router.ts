/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as KoaRouter from '@koa/router'
import * as Koa from 'koa'

import { OpenApiManager } from '../openapi/manager/OpenApiManager'
import { ExtractedRequestParams } from '../utils/TypeUtils'
import { responseValueToJson } from './responseValueToJson'

type Props = {
	skipOpenApiAnalysis: boolean
}

export class Router<StateT = Koa.DefaultState, ContextT = Koa.DefaultContext> {
	public koaRouter: KoaRouter = new KoaRouter()

	public constructor(props: Props = { skipOpenApiAnalysis: false }) {
		if (!props.skipOpenApiAnalysis) {
			const openApiManager = OpenApiManager.getInstance()
			openApiManager.registerRouters([this])
		}
	}

	public use(...middleware: Array<KoaRouter.Middleware<StateT, ContextT>>) {
		// @ts-ignore
		this.koaRouter.use(...middleware)
		return this
	}

	public with<ResponseTypeT extends Record<string, any>>(
		middleware: (ctx: Koa.ParameterizedContext<ContextT>) => ResponseTypeT
	) {
		type AugmentedData = ResponseTypeT extends Promise<any> ? Awaited<ResponseTypeT> : ResponseTypeT
		this.koaRouter.use(async (ctx, next) => {
			// @ts-ignore
			const userData = await Promise.resolve(middleware(ctx))
			Object.keys(userData).forEach((key) => {
				ctx[key] = userData[key]
			})
			await next()
		})
		return this as Router<StateT, ContextT & AugmentedData>
	}

	public get<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.get(path, async (ctx) => {
			// @ts-ignore
			const responseValue = await callback(ctx, undefined)
			ctx.body = responseValueToJson(responseValue)
		})
		return this
	}

	public post<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.post(path, async (ctx) => {
			// @ts-ignore
			const responseValue = await callback(ctx, undefined)
			ctx.body = responseValueToJson(responseValue)
		})
		return this
	}

	public put<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.put(path, async (ctx) => {
			// @ts-ignore
			const responseValue = await callback(ctx, undefined)
			ctx.body = responseValueToJson(responseValue)
		})
		return this
	}

	public delete<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.delete(path, async (ctx) => {
			// @ts-ignore
			const responseValue = await callback(ctx, undefined)
			ctx.body = responseValueToJson(responseValue)
		})
		return this
	}

	public del<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.del(path, async (ctx) => {
			// @ts-ignore
			const responseValue = await callback(ctx, undefined)
			ctx.body = responseValueToJson(responseValue)
		})
		return this
	}

	public patch<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.patch(path, async (ctx) => {
			// @ts-ignore
			const responseValue = await callback(ctx, undefined)
			ctx.body = responseValueToJson(responseValue)
		})
		return this
	}

	public routes() {
		return this.koaRouter.routes()
	}

	public allowedMethods() {
		return this.koaRouter.allowedMethods()
	}
}
