import { Router as RenamedRouter } from '../../../router/Router'

const namedRouterVariable = new RenamedRouter()

namedRouterVariable.get('/api', () => {
	return 'test-data'
})

const anotherRouterVariable = new RenamedRouter()
	.use((_, next) => next())
	.with(() => {
		const user = { id: '123' }
		return {
			user,
		}
	})

anotherRouterVariable.get('/api', () => {
	return 'more-test-data'
})

export default new RenamedRouter()
	.get('/anonapi', () => {
		return 'otherdata'
	})
	.get('/anonapitwo', () => {
		return 'otherdata'
	})
	.get('/anonapithree', () => {
		return 'otherdata'
	})

// Exists to make sure that discovery module ignores unrelated objects
class Router {
	value = 'foo'

	setValue(val: string) {
		this.value = val
	}
}
const unrelatedObject = new Router()
unrelatedObject.setValue('bar')
