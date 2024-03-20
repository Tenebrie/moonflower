import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import { resolve } from 'path'

import { HttpErrorHandler, initOpenApiEngine, useApiHeader as useRenamedApiHeader } from '..'
import { TestAppRouter } from './TestAppRouter'

export const app = new Koa()

useRenamedApiHeader({
	title: 'Test title',
	version: '1.0.0',
	description: 'Test description',
	termsOfService: 'http://example.com',
	contact: {
		name: 'QA Engineer',
		url: 'http://best-qa.com',
		email: 'admin@best-qa.com',
	},
	license: {
		name: 'MIT',
		url: 'http://best-qa.com/license',
	},
})

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
			sourceFileDiscovery: {
				rootPath: resolve(__dirname, '.'),
			},
			sourceFilePaths: ['./src/test/TestAppRouter.ts'],
		})
	)
