import { ParameterizedContext } from 'koa'

import { ValidationError } from '../errors/UserFacingErrors'
import { keysOf } from '../utils/object'
import { SplitStringBy } from '../utils/TypeUtils'
import { getValidationResultMessage } from '../utils/validationMessages'
import { Validator } from '../validators/types'

type CheckIfOptional<T, B> = B extends string ? (B extends `${string}?` ? T | undefined : T) : never

type ValidatedData<
	ParamsT extends string[],
	TestTemplate extends {
		[K in keyof ParamsT]: {
			original: ParamsT[K]
			cleaned: CleanUpPathParam<ParamsT[K]>
			callback: ValidatorsT[CleanUpPathParam<ParamsT[K]>]
		}
	},
	ValidatorsT extends Record<TestTemplate[number]['cleaned'], Omit<Validator<any>, 'optional'>>
> = {
	[K in keyof TestTemplate as K extends `${number}` ? TestTemplate[K]['cleaned'] : never]: CheckIfOptional<
		ReturnType<TestTemplate[K]['callback']['rehydrate']>,
		TestTemplate[K]['original']
	>
}

type RemoveLeadingColon<S extends string> = S['length'] extends 0 ? never : SplitStringBy<S, ':'>[1]
type RemoveTrailingQuestion<S extends string> = S['length'] extends 0 ? never : SplitStringBy<S, '?'>[0]
type CleanUpPathParam<S> = S extends string
	? RemoveLeadingColon<RemoveTrailingQuestion<S>> extends string
		? RemoveLeadingColon<RemoveTrailingQuestion<S>>
		: ''
	: never

export const usePathParams = <
	ParamsT extends string[],
	TestTemplate extends {
		[K in keyof ParamsT]: {
			original: ParamsT[K]
			cleaned: CleanUpPathParam<ParamsT[K]>
			callback: ValidatorsT[CleanUpPathParam<ParamsT[K]>]
		}
	},
	ValidatorsT extends Record<CleanUpPathParam<ParamsT[number]>, Omit<Validator<any>, 'optional'>>
>(
	ctx: ParameterizedContext & { parsedPathParams: ParamsT },
	validators: Pick<ValidatorsT, CleanUpPathParam<ParamsT[number]>>
): ValidatedData<ParamsT, TestTemplate, ValidatorsT> => {
	const params = ctx.params
	const expectedParams = keysOf(validators).map((name) => ({
		name,
		validator: validators[name],
	}))

	const validationResults = expectedParams.map((param) => {
		const paramValue = params[param.name] as string

		// Param is optional and is not provided - skip validation
		if (paramValue === undefined) {
			return { param, validated: true }
		}

		try {
			const validatorObject = param.validator
			const prevalidatorSuccess = !validatorObject.prevalidate || validatorObject.prevalidate(paramValue)
			const rehydratedValue = validatorObject.rehydrate(paramValue)
			const validatorSuccess = !validatorObject.validate || validatorObject.validate(rehydratedValue)
			return {
				param,
				validated: prevalidatorSuccess && validatorSuccess,
				rehydratedValue,
			}
		} catch (error) {
			return { param, validated: false }
		}
	})

	const failedValidations = validationResults.filter((result) => !result.validated)

	if (failedValidations.length > 0) {
		throw new ValidationError(
			`Failed route param validation: ${failedValidations
				.map((result) => getValidationResultMessage(result.param))
				.join(', ')}`
		)
	}

	const successfulValidations = validationResults.filter((result) => result.validated)

	const returnValue: Record<string, unknown> = {}
	successfulValidations.forEach((result) => {
		returnValue[result.param.name] = result.rehydratedValue
	})

	return returnValue as ValidatedData<ParamsT, TestTemplate, ValidatorsT>
}
