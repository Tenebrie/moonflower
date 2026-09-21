import { ParameterizedContext } from 'koa'
import z from 'zod'

import { ValidationError } from '../errors/UserFacingErrors'
import { keysOf } from '../utils/object'
import { getValidationResultMessage } from '../utils/validationMessages'
import { Validator } from '../validators/types'
import { validateMissingParams } from '../validators/validateMissingParams'
import { applyDefaultValue, validateParam } from '../validators/validateParam'

type CheckIfOptional<T, B extends boolean | undefined> = B extends false ? T : T | undefined

type ValidatedData<T extends Record<string, Validator<any> | z.ZodType<any>>> = {
	[K in keyof T]: CheckIfOptional<
		ReturnType<T[K] extends Validator<any> ? T[K]['parse'] : T[K]['parse']>,
		T[K] extends Validator<any> ? T[K]['optional'] : false
	>
}

export const useCookieParams = <ValidatorsT extends Record<string, Validator<any> | z.ZodType<any>>>(
	ctx: ParameterizedContext,
	validators: ValidatorsT,
): ValidatedData<ValidatorsT> => {
	const params = keysOf(validators).map((name) => ({
		name,
		validator: validators[name],
		value: ctx.cookies.get(name),
	}))

	const providedParams = Object.fromEntries(params.map((param) => [param.name, param.value]))

	validateMissingParams(params, providedParams, 'cookie')

	const validationResults = params.map((param) => {
		const paramValue = param.value

		// Param is not provided - fall back to the validator's default value, if any
		if (paramValue === undefined) {
			return { ...applyDefaultValue(param.validator), param }
		}

		return {
			...validateParam(param.validator, paramValue),
			param,
		}
	})

	const failedValidations = validationResults.filter((result) => !result.validated)

	if (failedValidations.length > 0) {
		throw new ValidationError(
			`Failed cookie param validation: ${failedValidations
				.map((result) => getValidationResultMessage(result.param))
				.join(', ')}`,
		)
	}

	const successfulValidations = validationResults.filter((result) => result.validated)

	const returnValue: Record<string, unknown> = {}
	successfulValidations.forEach((result) => {
		returnValue[result.param.name] = result.parsedValue
	})

	return returnValue as ValidatedData<ValidatorsT>
}
