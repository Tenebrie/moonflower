import z from 'zod'

import { ValidationError } from '../errors/UserFacingErrors'
import { getMissingParamMessage } from '../utils/validationMessages'
import { MaybeOptionalValidatorUnion } from './types'

const missingParamsPrefix = {
	body: 'Missing body params',
	query: 'Missing query params',
	path: 'Missing path params',
	cookie: 'Missing cookie params',
	header: 'Missing headers',
} as const

export function validateMissingParams(
	params: { name: string; validator: MaybeOptionalValidatorUnion }[],
	providedParams: Record<string, unknown>,
	kind: keyof typeof missingParamsPrefix,
) {
	const missingParams = params.filter((param) => {
		let isOptional = param.validator.optional
		if (param.validator instanceof z.ZodType) {
			isOptional = param.validator.safeParse(undefined).success
		}

		return providedParams[param.name] === undefined && !isOptional
	})

	if (missingParams.length > 0) {
		throw new ValidationError(
			`${missingParamsPrefix[kind]}: ${missingParams
				.map((param) => getMissingParamMessage(param))
				.join(', ')}`,
		)
	}
}
