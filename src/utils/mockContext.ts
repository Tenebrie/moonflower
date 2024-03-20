import Koa from 'koa'
import * as httpMocks from 'node-mocks-http'

import { keysOf } from './object'
import { ExtractedRequestParams } from './TypeUtils'

export interface MockContext<RequestBody = undefined> extends Koa.Context {
	request: Koa.Context['request'] & {
		body?: RequestBody
	}
}

export const mockContext = <State = Koa.DefaultState, Context = MockContext>() => {
	const app = new Koa<State, Context>()
	const req = httpMocks.createRequest()
	const res = httpMocks.createResponse()
	const context = app.createContext(req, res) as Koa.ParameterizedContext<State, Context>
	res.statusCode = 404
	return context
}

export const mockContextPath = <Context extends Koa.ParameterizedContext, Path extends string>(
	ctx: Context,
	path: Path,
	params: Record<string, string>
) => {
	const typedContext = ctx as Context & { params: any } & ExtractedRequestParams<Path>
	ctx.request.path = path
	typedContext.params = params
	return typedContext
}

export const mockContextQuery = <Context extends Koa.ParameterizedContext>(
	ctx: Context,
	params: Record<string, string>
) => {
	ctx.query = params
	return ctx
}

export const mockContextCookies = <Context extends Koa.ParameterizedContext>(
	ctx: Context,
	params: Record<string, string | { value: string; expires?: Date }>
) => {
	const cookies = keysOf(params).map((name) => {
		const cookieData = params[name]

		return {
			name,
			value: typeof cookieData === 'string' ? cookieData : cookieData.value,
			expires: typeof cookieData === 'string' ? undefined : cookieData.expires,
		}
	})
	ctx.cookies = {
		...ctx.cookies,
		get: (name: string) => {
			return cookies.find((cookie) => cookie.name === name)?.value || undefined
		},
	}
	return ctx
}

export const mockContextHeaders = <Context extends Koa.ParameterizedContext>(
	ctx: Context,
	params: Record<string, string>
) => {
	ctx.request.headers = params
	return ctx
}

export const mockContextBody = <Context extends Koa.ParameterizedContext>(
	ctx: Context,
	params: Record<string, string | number | boolean | object | null>
) => {
	ctx.request.body = params
	ctx.request.rawBody = JSON.stringify(params)
	return ctx
}

export const mockContextRawBody = <Context extends Koa.ParameterizedContext>(
	ctx: Context,
	params: string
) => {
	ctx.request.rawBody = params
	return ctx
}
