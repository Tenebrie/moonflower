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

function isZodArrayValidator(validator: z.ZodType): boolean {
	if (validator instanceof z.ZodArray) return true
	if (validator instanceof z.ZodOptional) return validator.unwrap() instanceof z.ZodArray
	return false
}

function runParser(validator: ValidatorUnion, value: string | number | boolean | object | null) {
	// Zod validator
	if (validator instanceof z.ZodType) {
		const isArrayValidator = isZodArrayValidator(validator)
		const coercedValue = (() => {
			if (typeof value !== 'string') return value

			try {
				const parsed = JSON.parse(value)
				if (isArrayValidator && !Array.isArray(parsed)) {
					return coerceCommaSeparatedToArray(value)
				}
				return parsed
			} catch {
				if (isArrayValidator) {
					return coerceCommaSeparatedToArray(value)
				}
				return value
			}
		})()
		return validator.parse(coercedValue)
	}
	// Legacy validator
	return validator.parse(getValueAsNullableString(value))
}

function coerceCommaSeparatedToArray(value: string): unknown[] {
	return value.split(',').map((element) => {
		const trimmed = element.trim()
		try {
			return JSON.parse(trimmed)
		} catch {
			return trimmed
		}
	})
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
