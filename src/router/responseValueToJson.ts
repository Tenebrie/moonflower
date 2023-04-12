export const responseValueToJson = (value: any) => {
	if (typeof value === 'string') {
		return value
	}
	return JSON.stringify(value, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
}
