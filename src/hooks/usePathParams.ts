import { ParameterizedContext } from 'koa'

import { ValidationError } from '../errors/UserFacingErrors'
import { keysOf } from '../utils/object'
import { CleanUpPathParam } from '../utils/TypeUtils'
import { getValidationResultMessage } from '../utils/validationMessages'
import { Validator } from '../validators/types'
import { validateParam } from '../validators/validateParam'

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
	ValidatorsT extends Record<TestTemplate[number]['cleaned'], Omit<Validator<any>, 'optional'>>,
> = {
	[K in keyof TestTemplate as K extends `${number}` ? TestTemplate[K]['cleaned'] : never]: CheckIfOptional<
		ReturnType<TestTemplate[K]['callback']['parse']>,
		TestTemplate[K]['original']
	>
}

export const usePathParams = <
	ParamsT extends string[],
	TestTemplate extends {
		[K in keyof ParamsT]: {
			original: ParamsT[K]
			cleaned: CleanUpPathParam<ParamsT[K]>
			callback: ValidatorsT[CleanUpPathParam<ParamsT[K]>]
		}
	},
	ValidatorsT extends Record<CleanUpPathParam<ParamsT[number]>, Omit<Validator<any>, 'optional'>>,
>(
	ctx: ParameterizedContext & { parsedPathParams: ParamsT },
	validators: ValidatorsT,
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
			`Failed route param validation: ${failedValidations
				.map((result) => getValidationResultMessage(result.param))
				.join(', ')}`,
		)
	}

	const successfulValidations = validationResults.filter((result) => result.validated)

	const returnValue: Record<string, unknown> = {}
	successfulValidations.forEach((result) => {
		returnValue[result.param.name] = result.parsedValue
	})

	return returnValue as ValidatedData<ParamsT, TestTemplate, ValidatorsT>
}
