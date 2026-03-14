import z from 'zod'

import { ValidationError } from '../errors/UserFacingErrors'
import { getMissingParamMessage } from '../utils/validationMessages'
import { MaybeOptionalValidatorUnion, Validator } from './types'

export function validateMissingParams<ValidatorsT extends Record<string, MaybeOptionalValidatorUnion>>(
	params: { name: string; validator: Pick<Validator<unknown>, 'description' | 'errorMessage'> }[],
	providedParams: Record<string, unknown>,
	validators: ValidatorsT,
	suffix: 'body' | 'query' | 'path',
) {
	const missingParams = params.filter((param) => {
		let isOptional = validators[param.name].optional
		if (validators[param.name] instanceof z.ZodType) {
			isOptional = (validators[param.name] as z.ZodType).safeParse(undefined).success
		}

		return providedParams[param.name] === undefined && !isOptional
	})

	if (missingParams.length > 0) {
		throw new ValidationError(
			`Missing ${suffix} params: ${missingParams.map((param) => getMissingParamMessage(param)).join(', ')}`,
		)
	}
}
