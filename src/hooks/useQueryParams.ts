import { ParameterizedContext } from 'koa'
import z from 'zod'

import { ValidationError } from '../errors/UserFacingErrors'
import { keysOf } from '../utils/object'
import { getValidationResultMessage } from '../utils/validationMessages'
import { Validator } from '../validators/types'
import { validateMissingParams } from '../validators/validateMissingParams'
import { validateParam } from '../validators/validateParam'

type CheckIfOptional<T, B extends boolean | undefined> = B extends false ? T : T | undefined

type ValidatedData<T extends Record<string, Validator<any> | z.ZodType<any>>> = {
	[K in keyof T]: CheckIfOptional<
		ReturnType<T[K] extends Validator<any> ? T[K]['parse'] : T[K]['parse']>,
		T[K] extends Validator<any> ? T[K]['optional'] : false
	>
}

export const useQueryParams = <ValidatorsT extends Record<string, Validator<any> | z.ZodType<any>>>(
	ctx: ParameterizedContext,
	validators: ValidatorsT,
): ValidatedData<ValidatorsT> => {
	const query = ctx.query
	const params = keysOf(validators).map((name) => ({
		name,
		validator: validators[name],
	}))

	validateMissingParams(params, query, validators, 'query')

	const validationResults = params.map((param) => {
		const paramValue = query[param.name]

		// Param is optional and is not provided - skip validation
		if (paramValue === undefined) {
			return { param, validated: true, parsedValue: undefined, exception: null }
		}

		return {
			...validateParam(param.validator, paramValue),
			param,
		}
	})

	const failedValidations = validationResults.filter((result) => !result.validated)

	if (failedValidations.length > 0) {
		throw new ValidationError(
			`Failed query param validation: ${failedValidations
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
