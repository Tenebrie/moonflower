import { SyntaxKind } from 'ts-morph'

import { loadTestData } from '../../../utils/loadTestData'
import { discoverRouters } from './discoverRouters'

describe('discoverRouters', () => {
	const dataFile = loadTestData('discoverRouters.spec.data.ts')

	it('discovers routers from single file correctly', () => {
		const routers = discoverRouters(dataFile)

		expect(routers.named.length).toEqual(2)
		expect(routers.named[0]).toEqual('namedRouterVariable')
		expect(routers.named[1]).toEqual('anotherRouterVariable')
		expect(routers.anonymous.length).toEqual(1)
		expect(routers.anonymous[0].getKind()).toEqual(SyntaxKind.CallExpression)
	})
})
