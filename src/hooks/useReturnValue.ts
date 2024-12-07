export const useReturnValue = <T, S extends number, Y extends string>(
	value: T,
	status: S,
	contentType: Y
) => {
	return {
		_isUseReturnValue: true as const,
		status,
		value,
		contentType,
	}
}
