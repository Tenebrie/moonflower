export function getValueAsNullableString(value: unknown) {
	if (value === null) {
		return null
	} else if (typeof value === 'object') {
		return JSON.stringify(value)
	}
	return String(value)
}
