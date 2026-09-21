import { ParameterizedContext } from 'koa'
import z from 'zod'

import { ValidationError } from '../errors/UserFacingErrors'
import { kebabToCamelCase, keysOf } from '../utils/object'
import { CamelCase } from '../utils/TypeUtils'
import { getValidationResultMessage as getValidationFailedMessage } from '../utils/validationMessages'
import { Validator } from '../validators/types'
import { validateMissingParams } from '../validators/validateMissingParams'
import { applyDefaultValue, validateParam } from '../validators/validateParam'

type CheckIfOptional<T, B extends boolean | undefined> = B extends false ? T : T | undefined

type HeaderToCamelCase<T> = T extends string ? CamelCase<Uncapitalize<T>> : T

type ValidatedData<T extends Record<string, Validator<any> | z.ZodType<any>>> = {
	[K in keyof T as HeaderToCamelCase<K>]: CheckIfOptional<
		ReturnType<T[K] extends Validator<any> ? T[K]['parse'] : T[K]['parse']>,
		T[K] extends Validator<any> ? T[K]['optional'] : false
	>
}

export const useHeaderParams = <ValidatorsT extends Record<string, Validator<any> | z.ZodType<any>>>(
	ctx: ParameterizedContext,
	validators: ValidatorsT,
) => {
	const headers = ctx.headers
	const params = keysOf(validators).map((name) => ({
		name: name.toLowerCase(),
		originalName: name,
		validator: validators[name],
	}))

	validateMissingParams(params, headers, 'header')

	const validationResults = params.map((param) => {
		const paramValue = headers[param.name]

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
			`Failed header validation: ${failedValidations
				.map((result) => getValidationFailedMessage(result.param))
				.join(', ')}`,
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
