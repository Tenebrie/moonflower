import { ValidationError } from '../errors/UserFacingErrors'
import { BuiltInValidatorParam } from './InternalParamWrappers'

export const EmailValidator = BuiltInValidatorParam({
	parse: (v) => String(v),
	validate: (v) => v.includes('@'),
	description: "A string containing an '@' sign",
	errorMessage: "Must include an '@' sign",
})
export const BooleanValidator = BuiltInValidatorParam({
	prevalidate: (v) => v === '0' || v === '1' || v === 'false' || v === 'true',
	parse: (v) => v === '1' || v === 'true',
	description: 'Any boolean value',
	errorMessage: "Must be '0', '1', 'false' or 'true'",
})
export const NullableBooleanValidator = BuiltInValidatorParam({
	prevalidate: (v) => v === '0' || v === '1' || v === 'false' || v === 'true' || v === null,
	parse: (v) => v === '1' || v === 'true' || v === null,
	description: 'Any boolean value',
	errorMessage: "Must be '0', '1', 'false' or 'true'",
})
export const StringValidator = BuiltInValidatorParam({
	parse: (v) => String(v),
	description: 'Any string value',
	errorMessage: 'Must be a valid string',
})
export const NullableStringValidator = BuiltInValidatorParam({
	parse: (v) => v,
	description: 'Any string or null value',
	errorMessage: 'Must be a valid string or null',
})
export const NonEmptyStringValidator = BuiltInValidatorParam({
	parse: (v) => String(v),
	validate: (v) => v.length > 0,
	description: 'Any string value with at least one character',
	errorMessage: 'Must be a string with at least one character',
})
export const NumberValidator = BuiltInValidatorParam({
	parse: (v) => Number(v),
	validate: (v) => Number.isFinite(v) && !Number.isNaN(v),
	description: 'Any numeric value',
	errorMessage: 'Must be a valid number',
})
export const NullableNumberValidator = BuiltInValidatorParam({
	parse: (v) => (v === null ? null : Number(v)),
	validate: (v) => v === null || (Number.isFinite(v) && !Number.isNaN(v)),
	description: 'Any numeric value',
	errorMessage: 'Must be a valid number',
})
export const BigIntValidator = BuiltInValidatorParam({
	parse: (v) => {
		if (v === null) {
			throw new ValidationError('Encountered an unexpected null value')
		}
		return BigInt(v)
	},
	description: 'Any numeric value',
	errorMessage: 'Must be a valid number',
})
export const NullableBigIntValidator = BuiltInValidatorParam({
	parse: (v) => (v === null ? null : BigInt(v)),
	description: 'Any numeric value',
	errorMessage: 'Must be a valid number',
})
