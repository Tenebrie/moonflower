import {
	BadRequestError,
	EmailValidator,
	NonEmptyStringValidator,
	UnauthorizedError,
	useQueryParams,
} from '..'
import { Router as RenamedRouter } from '../router/Router'

const myRouter = new RenamedRouter()
	.use((_, next) => next())
	.with(() => {
		const user = { id: '123' }
		return {
			user,
		}
	})

myRouter.get('/test/hello', () => {
	return {
		greeting: 'hello world',
	}
})

myRouter.get('/test/query', (ctx) => {
	const { email, string } = useQueryParams(ctx, {
		email: EmailValidator,
		string: NonEmptyStringValidator,
	})
	return {
		email,
		string,
	}
})

myRouter.post('/test/post', () => {
	return 'post response'
})

myRouter.del('/test/del', () => {
	// Empty
})

myRouter.delete('/test/delete', () => {
	// Empty
})

myRouter.patch('/test/patch', () => {
	return 'patch response'
})

myRouter.get('/test/error/generic', () => {
	throw new Error('Generic error')
})

myRouter.get('/test/error/unauthorized', () => {
	throw new UnauthorizedError('Test error')
})

myRouter.get('/test/error/badrequest', () => {
	throw new BadRequestError('Test error')
})

myRouter.get('/test/get/bigint', () => {
	return {
		foo: BigInt(100),
	}
})

myRouter.get('/test/get/middleware-data', (ctx) => {
	return {
		user: ctx.user,
	}
})

export const TestAppRouter = myRouter
