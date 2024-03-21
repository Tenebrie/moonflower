import { ParameterizedContext } from 'koa'

import { ValidationError } from '../errors/UserFacingErrors'
import { keysOf } from '../utils/object'
import { getMissingParamMessage, getValidationResultMessage } from '../utils/validationMessages'
import { Validator } from '../validators/types'

type CheckIfOptional<T, B extends boolean | undefined> = B extends false ? T : T | undefined

type ValidatedData<T extends Record<string, Validator<any>>> = {
	[K in keyof T]: CheckIfOptional<ReturnType<T[K]['parse']>, T[K]['optional']>
}

export const useCookieParams = <ValidatorsT extends Record<string, Validator<any>>>(
	ctx: ParameterizedContext,
	validators: ValidatorsT
): ValidatedData<ValidatorsT> => {
	const params = keysOf(validators).map((name) => ({
		name,
		validator: validators[name],
		value: ctx.cookies.get(name),
	}))

	const missingParams = params.filter((param) => !param.value && !param.validator.optional)

	if (missingParams.length > 0) {
		throw new ValidationError(
			`Missing cookie params: ${missingParams.map((param) => getMissingParamMessage(param)).join(', ')}`
		)
	}

	const validationResults = params.map((param) => {
		const paramValue = param.value

		// Param is optional and is not provided - skip validation
		if (paramValue === undefined) {
			return { param, validated: true }
		}

		try {
			const validatorObject = param.validator
			const prevalidatorSuccess = !validatorObject.prevalidate || validatorObject.prevalidate(paramValue)
			const parsedValue = validatorObject.parse(paramValue)
			const validatorSuccess = !validatorObject.validate || validatorObject.validate(parsedValue)
			return {
				param,
				validated: prevalidatorSuccess && validatorSuccess,
				parsedValue,
			}
		} catch (error) {
			return { param, validated: false }
		}
	})

	const failedValidations = validationResults.filter((result) => !result.validated)

	if (failedValidations.length > 0) {
		throw new ValidationError(
			`Failed cookie param validation: ${failedValidations
				.map((result) => getValidationResultMessage(result.param))
				.join(', ')}`
		)
	}

	const successfulValidations = validationResults.filter((result) => result.validated)

	const returnValue: Record<string, unknown> = {}
	successfulValidations.forEach((result) => {
		returnValue[result.param.name] = result.parsedValue
	})

	return returnValue as ValidatedData<ValidatorsT>
}
