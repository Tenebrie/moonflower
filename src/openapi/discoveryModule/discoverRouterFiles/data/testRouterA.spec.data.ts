import { Router } from '../../../../router/Router'

export const router = new Router()

router.get('/api-a', () => {
	return 'test-data'
})
