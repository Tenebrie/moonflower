/* eslint-disable @typescript-eslint/ban-ts-comment */
import KoaRouter from '@koa/router'
import Koa from 'koa'

import { OpenApiManager } from '../openapi/manager/OpenApiManager'
import { ExtractedRequestParams } from '../utils/TypeUtils'
import { parseEndpointReturnValue } from './parseEndpointReturnValue'

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

	private async sendResponseValue<P extends string>(
		ctx: Parameters<Parameters<KoaRouter['get']>[1]>[0],
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		// @ts-ignore
		const responseValue = await callback(ctx, undefined)
		const { value, status, contentType } = parseEndpointReturnValue(responseValue)
		ctx.body = value
		if (status !== 'unset') {
			ctx.status = status
		}
		ctx.set('Content-Type', contentType)
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
			await this.sendResponseValue(ctx, callback)
		})
		return this
	}

	public post<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.post(path, async (ctx) => {
			await this.sendResponseValue(ctx, callback)
		})
		return this
	}

	public put<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.put(path, async (ctx) => {
			await this.sendResponseValue(ctx, callback)
		})
		return this
	}

	public delete<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.delete(path, async (ctx) => {
			await this.sendResponseValue(ctx, callback)
		})
		return this
	}

	public del<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.del(path, async (ctx) => {
			await this.sendResponseValue(ctx, callback)
		})
		return this
	}

	public patch<P extends string>(
		path: P,
		callback: KoaRouter.Middleware<StateT, ContextT & ExtractedRequestParams<P>>
	) {
		this.koaRouter.patch(path, async (ctx) => {
			await this.sendResponseValue(ctx, callback)
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
