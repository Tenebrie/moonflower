import { ParameterizedContext } from 'koa'

import { ValidationError } from '../errors/UserFacingErrors'
import { getFailedRawBodyValidationMessage, getMissingRawBodyMessage } from '../utils/validationMessages'
import { Validator } from '../validators/types'

type CheckIfOptional<T, B extends boolean | undefined> = B extends false ? T : T | undefined

type ValidatedData<T extends Validator<any>> = CheckIfOptional<ReturnType<T['rehydrate']>, T['optional']>

/**
 * Hook to access request body data without parsing into an object.
 *
 * Supported content types:
 * - `text/plain`
 * - `application/json`
 * - `application/x-www-form-urlencoded`
 *
 * @param ctx Koa context
 * @param validators Validator definitions
 * @returns Validated parameters
 */
export const useRequestRawBody = <ValidatorT extends Validator<any>>(
	ctx: ParameterizedContext,
	validator: ValidatorT
): ValidatedData<ValidatorT> => {
	const providedBody = ctx.request.rawBody
	const isOptional = validator.optional

	if (!isOptional && !providedBody) {
		throw new ValidationError(getMissingRawBodyMessage(validator))
	}

	if (isOptional && !providedBody) {
		return undefined as ValidatedData<ValidatorT>
	}

	const validationResult = (() => {
		try {
			const prevalidatorSuccess = !validator.prevalidate || validator.prevalidate(providedBody)
			const rehydratedValue = validator.rehydrate(providedBody)
			const validatorSuccess = !validator.validate || validator.validate(rehydratedValue)
			return {
				validated: prevalidatorSuccess && validatorSuccess,
				rehydratedValue,
			}
		} catch (error) {
			return { validated: false }
		}
	})()

	if (!validationResult.validated) {
		throw new ValidationError(getFailedRawBodyValidationMessage(validator))
	}
	return validationResult.rehydratedValue as ValidatedData<ValidatorT>
}
