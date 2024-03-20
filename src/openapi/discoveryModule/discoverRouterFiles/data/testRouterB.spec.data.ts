import { Router } from '../../../../router/Router'

export const router = new Router()

router.get('/api-b', () => {
	return 'test-data'
})
