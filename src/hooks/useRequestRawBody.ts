import { ParameterizedContext } from 'koa'
import z from 'zod'

import { ValidationError } from '../errors/UserFacingErrors'
import { getFailedRawBodyValidationMessage, getMissingRawBodyMessage } from '../utils/validationMessages'
import { Validator } from '../validators/types'
import { applyDefaultValue, validateParam } from '../validators/validateParam'

type CheckIfOptional<T, B extends boolean | undefined> = B extends false ? T : T | undefined

type ValidatedData<T extends Validator<any> | z.ZodType<any>> = CheckIfOptional<
	ReturnType<T['parse']>,
	T extends Validator<any> ? T['optional'] : false
>

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
export const useRequestRawBody = <ValidatorT extends Validator<any> | z.ZodType<any>>(
	ctx: ParameterizedContext,
	validator: ValidatorT,
): ValidatedData<ValidatorT> => {
	const providedBody = ctx.request.rawBody
	let isOptional = validator.optional
	if (validator instanceof z.ZodType) {
		isOptional = validator.safeParse(undefined).success
	}

	if (!isOptional && !providedBody) {
		throw new ValidationError(getMissingRawBodyMessage(validator))
	}

	if (isOptional && !providedBody) {
		// Body is not provided - fall back to the validator's default value, if any
		return applyDefaultValue(validator).parsedValue as ValidatedData<ValidatorT>
	}

	const validationResult = validateParam(validator, providedBody)

	if (!validationResult.validated) {
		throw new ValidationError(getFailedRawBodyValidationMessage(validator))
	}
	return validationResult.parsedValue as ValidatedData<ValidatorT>
}
