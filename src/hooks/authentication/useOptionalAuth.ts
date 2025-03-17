import { ParameterizedContext } from 'koa'

import { UnauthorizedError, ValidationError } from '../../errors/UserFacingErrors'

export const useOptionalAuth = async <UserObject>(
	ctx: ParameterizedContext,
	authenticator: (ctx: ParameterizedContext) => UserObject | Promise<UserObject>,
): Promise<UserObject | undefined> => {
	try {
		return await authenticator(ctx)
	} catch (err) {
		if (err instanceof UnauthorizedError || err instanceof ValidationError) {
			return undefined
		}
		throw err
	}
}
