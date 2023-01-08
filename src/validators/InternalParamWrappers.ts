import { BuiltInValidator } from './types'

/**
 * More complex type to preserve description and errorMessage in .d.ts file.
 * Functionally identical to RequiredParam.
 * For internal use only.
 */
export const BuiltInValidatorParam = <T, DescriptionT extends string, ErrorMessageT extends string>(
	validator: Omit<BuiltInValidator<T, DescriptionT, ErrorMessageT>, 'optional'> &
		Pick<BuiltInValidator<T, DescriptionT, ErrorMessageT>, 'description' | 'errorMessage'>
): BuiltInValidator<T, DescriptionT, ErrorMessageT> & { optional: false } => ({
	...validator,
	optional: false,
})
