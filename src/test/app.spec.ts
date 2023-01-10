import * as request from 'supertest'

import { generateOpenApiSpec } from '../openapi/generatorModule/generatorModule'
import { app } from './app'

describe('TestAppRouter', () => {
	it('handles get request correctly', async () => {
		const response = await request(app.callback()).get('/test/hello')
		expect(response.status).toBe(200)
		expect(response.text).toBe(JSON.stringify({ greeting: 'hello world' }))
	})

	it('handles query params', async () => {
		const response = await request(app.callback()).get('/test/query?email=test@test.com&string=someval')
		expect(response.status).toBe(200)
		expect(response.text).toBe(JSON.stringify({ email: 'test@test.com', string: 'someval' }))
	})

	it('handles incorrect method', async () => {
		const response = await request(app.callback()).post('/test/hello')
		expect(response.status).toBe(405)
		expect(response.text).toBe('Method Not Allowed')
	})

	it('handles post request correctly', async () => {
		const response = await request(app.callback()).post('/test/post')
		expect(response.status).toBe(200)
		expect(response.text).toBe('post response')
	})

	it('handles del request correctly', async () => {
		const response = await request(app.callback()).del('/test/del')
		expect(response.status).toBe(204)
		expect(response.text).toBe('')
	})

	it('handles delete request correctly', async () => {
		const response = await request(app.callback()).delete('/test/delete')
		expect(response.status).toBe(204)
		expect(response.text).toBe('')
	})

	it('handles patch request correctly', async () => {
		const response = await request(app.callback()).patch('/test/patch')
		expect(response.status).toBe(200)
		expect(response.text).toBe('patch response')
	})

	it('rethrows a generic error', async () => {
		const consoleError = console.error
		console.error = jest.fn()
		const response = await request(app.callback()).get('/test/error/generic')
		expect(response.status).toBe(500)
		expect(response.text).toBe('Internal Server Error')
		console.error = consoleError
	})

	it('handles an unauthorized error correctly', async () => {
		const response = await request(app.callback()).get('/test/error/unauthorized')
		expect(response.status).toBe(401)
		expect(response.text).toBe(JSON.stringify({ status: 401, reason: 'Unauthorized', message: 'Test error' }))
	})

	it('handles a bad request error correctly', async () => {
		const response = await request(app.callback()).get('/test/error/badrequest')
		expect(response.status).toBe(400)
		expect(response.text).toBe(JSON.stringify({ status: 400, reason: 'Bad Request', message: 'Test error' }))
	})
})

describe('OpenApiRouter', () => {
	it('sends the openapi spec', async () => {
		const response = await request(app.callback()).get('/api-json')
		expect(response.status).toBe(200)
		const responseJson = JSON.parse(response.text) as ReturnType<typeof generateOpenApiSpec>
		expect(responseJson.openapi).toBe('3.0.3')
		expect(responseJson.paths['/test/hello']).toEqual({
			get: {
				description: '',
				parameters: [],
				responses: {
					'200': {
						description: '',
						content: {
							'application/json': {
								schema: {
									oneOf: [
										{
											type: 'object',
											properties: { greeting: { type: 'string' } },
											required: ['greeting'],
										},
									],
								},
							},
						},
					},
				},
			},
		})
	})
})
