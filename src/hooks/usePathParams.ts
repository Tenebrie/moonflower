import { ParameterizedContext } from 'koa'

import { ValidationError } from '../errors/UserFacingErrors'
import { keysOf } from '../utils/object'
import { CleanUpPathParam } from '../utils/TypeUtils'
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
	ValidatorsT extends Record<CleanUpPathParam<ParamsT[number]>, Omit<Validator<any>, 'optional'>>
>(
	ctx: ParameterizedContext & { parsedPathParams: ParamsT },
	validators: ValidatorsT
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
			`Failed route param validation: ${failedValidations
				.map((result) => getValidationResultMessage(result.param))
				.join(', ')}`
		)
	}

	const successfulValidations = validationResults.filter((result) => result.validated)

	const returnValue: Record<string, unknown> = {}
	successfulValidations.forEach((result) => {
		returnValue[result.param.name] = result.parsedValue
	})

	return returnValue as ValidatedData<ParamsT, TestTemplate, ValidatorsT>
}
