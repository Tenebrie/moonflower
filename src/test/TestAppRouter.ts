import {
	BadRequestError,
	EmailValidator,
	NonEmptyStringValidator,
	Router,
	UnauthorizedError,
	useQueryParams,
} from '..'

const router = new Router()

router.get('/test/hello', () => {
	return {
		greeting: 'hello world',
	}
})

router.get('/test/query', (ctx) => {
	const { email, string } = useQueryParams(ctx, {
		email: EmailValidator,
		string: NonEmptyStringValidator,
	})
	return {
		email,
		string,
	}
})

router.post('/test/post', () => {
	return 'post response'
})

router.del('/test/del', () => {
	// Empty
})

router.delete('/test/delete', () => {
	// Empty
})

router.patch('/test/patch', () => {
	return 'patch response'
})

router.get('/test/error/generic', () => {
	throw new Error('Generic error')
})

router.get('/test/error/unauthorized', () => {
	throw new UnauthorizedError('Test error')
})

router.get('/test/error/badrequest', () => {
	throw new BadRequestError('Test error')
})

export const TestAppRouter = router
