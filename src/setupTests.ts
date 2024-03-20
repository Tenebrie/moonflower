import { vi } from 'vitest'

// Clearing all mocks might help if a mock is causing the issue
vi.clearAllMocks()

// Or, if @koa/router is being mocked somewhere, ensure it's done correctly
vi.mock('@koa/router', () => {
	const ActualKoaRouter = vi.importActual('@koa/router')
	return ActualKoaRouter // Ensure the mock correctly exports the router
})

console.info = () => {
	/* Empty */
}
