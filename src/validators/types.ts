type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends Array<infer U>
		? Array<DeepPartial<U>>
		: T[P] extends ReadonlyArray<infer U>
			? ReadonlyArray<DeepPartial<U>>
			: DeepPartial<T[P]>
}

export type ValidateArg<T> = T extends object ? DeepPartial<T> : T

export type Validator<T> = {
	prevalidate?: (v: string | null) => boolean
	parse: (v: string | null) => T
	validate?: (v: ValidateArg<T>) => boolean
	/**
	 * The field is optional and validation will be skipped if it is not provided.
	 * Optional parameters will always be nullable.
	 * For `usePathParams` this field is ignored.
	 */
	optional: boolean
	/**
	 * OpenAPI description field.
	 * If 'errorMessage' is not provided, will be used to inform user in the event of failed validation.
	 */
	description?: string
	/**
	 * Error message sent to user when validation fails.
	 */
	errorMessage?: string
}

export type BuiltInValidator<T, DescriptionT extends string, ErrorMessageT extends string> = Validator<T> & {
	description: DescriptionT
	errorMessage: ErrorMessageT
}
