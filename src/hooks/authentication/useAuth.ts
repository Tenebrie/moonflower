import { ParameterizedContext } from 'koa'

export const useAuth = async <UserObject>(
	ctx: ParameterizedContext,
	authenticator: (ctx: ParameterizedContext) => UserObject | Promise<UserObject>
): Promise<UserObject> => {
	return await authenticator(ctx)
}
