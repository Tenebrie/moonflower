import { BuiltInValidator, Validator } from './types'

export const PathParam = <T>(
	validator: Omit<Validator<T>, 'optional'>
): Validator<T> & { optional: false } => ({
	...validator,
	optional: false,
})

export const RequiredParam = <T>(
	validator: Omit<Validator<T>, 'optional'>
): Validator<T> & { optional: false } => ({
	...validator,
	optional: false,
})

export const OptionalParam = <T>(
	validator: Omit<Validator<T>, 'optional'>
): Validator<T> & { optional: true } => ({
	...validator,
	optional: true,
})

/**
 * More complex type to preserve description and errorMessage in .d.ts file.
 * For internal use only.
 */
export const BuiltInValidatorParam = <T, DescriptionT extends string, ErrorMessageT extends string>(
	validator: Omit<BuiltInValidator<T, DescriptionT, ErrorMessageT>, 'optional'> &
		Pick<BuiltInValidator<T, DescriptionT, ErrorMessageT>, 'description' | 'errorMessage'>
): BuiltInValidator<T, DescriptionT, ErrorMessageT> & { optional: false } => ({
	...validator,
	optional: false,
})
