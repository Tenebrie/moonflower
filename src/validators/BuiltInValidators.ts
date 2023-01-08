import { BuiltInValidatorParam } from './InternalParamWrappers'

export const EmailString = BuiltInValidatorParam({
	rehydrate: (v) => v,
	validate: (v) => v.includes('@'),
	description: "A string containing an '@' sign." as const,
	errorMessage: "Must include an '@' sign.",
})
export const BooleanValidator = BuiltInValidatorParam({
	prevalidate: (v) => v === '0' || v === '1' || v === 'false' || v === 'true',
	rehydrate: (v) => v === '1' || v === 'true',
	description: 'Any boolean value.',
	errorMessage: "Must be '0', '1', 'false' or 'true'.",
})
export const StringValidator = BuiltInValidatorParam({
	rehydrate: (v) => v,
	description: 'Any string value.',
	errorMessage: 'Must be a valid string.',
})
export const NumberValidator = BuiltInValidatorParam({
	rehydrate: (v) => Number(v),
	validate: (v) => !Number.isNaN(v),
	description: 'Any numeric value.',
	errorMessage: 'Must be a valid number.',
})
export const NonEmptyStringValidator = BuiltInValidatorParam({
	rehydrate: (v) => v,
	validate: (v) => v.length > 0,
	description: 'Any string value with at least one character.',
	errorMessage: 'Must be a string with at least one character.',
})
