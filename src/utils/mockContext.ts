import * as Koa from 'koa'
import * as httpMocks from 'node-mocks-http'
import { ExtractedRequestParams } from '@src/utils/TypeUtils'

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

export const mockContextQuery = <Context extends Koa.ParameterizedContext, Path extends string>(
	ctx: Context,
	params: Record<string, string>
) => {
	const typedContext = ctx as Context & { params: any } & ExtractedRequestParams<Path>
	typedContext.query = params
	return typedContext
}
