import { ParameterizedContext } from 'koa'

import { ValidationError } from '../errors/UserFacingErrors'
import { kebabToCamelCase, keysOf } from '../utils/object'
import { CamelCase } from '../utils/TypeUtils'
import {
	getMissingParamMessage,
	getValidationResultMessage as getValidationFailedMessage,
} from '../utils/validationMessages'
import { Validator } from '../validators/types'

type CheckIfOptional<T, B extends boolean | undefined> = B extends false ? T : T | undefined

type HeaderToCamelCase<T> = T extends string ? CamelCase<Uncapitalize<T>> : T

type ValidatedData<T extends Record<string, Validator<any>>> = {
	[K in keyof T as HeaderToCamelCase<K>]: CheckIfOptional<ReturnType<T[K]['parse']>, T[K]['optional']>
}

export const useHeaderParams = <ValidatorsT extends Record<string, Validator<any>>>(
	ctx: ParameterizedContext,
	validators: ValidatorsT
) => {
	const headers = ctx.headers
	const params = keysOf(validators).map((name) => ({
		name: name.toLowerCase(),
		originalName: name,
		validator: validators[name],
	}))

	const missingParams = params.filter((param) => !headers[param.name] && !param.validator.optional)

	if (missingParams.length > 0) {
		throw new ValidationError(
			`Missing headers: ${missingParams.map((param) => getMissingParamMessage(param)).join(', ')}`
		)
	}

	const validationResults = params.map((param) => {
		const paramValue = headers[param.name]

		// Param is optional and is not provided - skip validation
		if (paramValue === undefined) {
			return { param, validated: true }
		}

		try {
			const validatorObject = param.validator
			const prevalidatorSuccess =
				!validatorObject.prevalidate || validatorObject.prevalidate(paramValue as string)
			const parsedValue = validatorObject.parse(paramValue as string)
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
			`Failed header validation: ${failedValidations
				.map((result) => getValidationFailedMessage(result.param))
				.join(', ')}`
		)
	}

	const successfulValidations = validationResults.filter((result) => result.validated)

	const returnValue: Record<string, unknown> = {}
	successfulValidations.forEach((result) => {
		returnValue[kebabToCamelCase(result.param.originalName)] = result.parsedValue
	})

	return returnValue as ValidatedData<ValidatorsT>
}

export const useRequestHeaders = useHeaderParams
