import z, { ZodError } from 'zod'

import { getValueAsNullableString } from '../utils/getValueAsNullableString'
import { ValidatorUnion } from './types'

export function validateParam(
	validator: ValidatorUnion,
	value: string | number | boolean | object | null,
): {
	validated: boolean
	parsedValue: unknown
	exception: string | null
} {
	try {
		const prevalidatorSuccess = runPrevalidator(validator, value)
		const parsedValue = runParser(validator, value)
		const validatorSuccess = runValidator(validator, parsedValue)

		return {
			validated: prevalidatorSuccess && validatorSuccess,
			parsedValue,
			exception: null,
		}
	} catch (error) {
		const exception = getErrorMessage(error)
		return { validated: false, parsedValue: null, exception }
	}
}

function runPrevalidator(validator: ValidatorUnion, value: string | number | boolean | object | null) {
	// Legacy validator
	if ('prevalidate' in validator && typeof validator.prevalidate === 'function') {
		return validator.prevalidate(getValueAsNullableString(value))
	}
	// Zod (skip)
	return true
}

function runParser(validator: ValidatorUnion, value: string | number | boolean | object | null) {
	// Zod validator
	if (validator instanceof z.ZodType) {
		const coercedValue = (() => {
			try {
				return typeof value === 'string' ? JSON.parse(value) : value
			} catch {
				return value
			}
		})()
		return validator.parse(coercedValue)
	}
	// Legacy validator
	return validator.parse(getValueAsNullableString(value))
}

function runValidator(validator: ValidatorUnion, parsedValue: unknown) {
	// Legacy validator
	if ('validate' in validator && typeof validator.validate === 'function') {
		return validator.validate(parsedValue)
	}
	// Zod (skip)
	return true
}

function getErrorMessage(error: unknown) {
	if (error instanceof ZodError) {
		return z.treeifyError(error).errors.join('; ').replace('Invalid input: ', '')
	}
	return 'Validation failed'
}
