import Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'

import { HttpErrorHandler, initOpenApiEngine } from '..'
import { TestAppRouter } from './TestAppRouter'

export const app = new Koa()

app
	.use(HttpErrorHandler)
	.use(
		bodyParser({
			enableTypes: ['text', 'json', 'form'],
		})
	)
	.use(TestAppRouter.routes())
	.use(TestAppRouter.allowedMethods())
	.use(
		initOpenApiEngine({
			tsconfigPath: './tsconfig.json',
			sourceFilePaths: ['./src/test/TestAppRouter.ts'],
		})
	)
