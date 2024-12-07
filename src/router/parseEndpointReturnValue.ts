export const parseEndpointReturnValue = (response: unknown) => {
	if (
		typeof response === 'object' &&
		response &&
		'value' in response &&
		typeof response['value'] === 'string' &&
		'contentType' in response &&
		typeof response['contentType'] === 'string'
	) {
		return {
			value: response.value,
			contentType: response.contentType,
		}
	}
	if (typeof response === 'string') {
		return {
			value: response,
			contentType: 'text/plain',
		}
	}
	if (Buffer.isBuffer(response)) {
		return {
			value: response,
			contentType: 'application/octet-stream',
		}
	}
	return {
		value: JSON.stringify(response, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
		contentType: 'application/json; charset=utf-8',
	}
}
