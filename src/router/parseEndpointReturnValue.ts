export const parseEndpointReturnValue = (response: unknown) => {
	if (
		typeof response === 'object' &&
		response &&
		'_isUseReturnValue' in response &&
		'value' in response &&
		'status' in response &&
		'contentType' in response &&
		response['_isUseReturnValue'] === true &&
		typeof response['status'] === 'number' &&
		typeof response['contentType'] === 'string'
	) {
		return {
			value: Buffer.isBuffer(response.value) ? response.value : String(response.value),
			status: response.status,
			contentType: response.contentType,
		}
	}
	if (['string', 'boolean', 'number', 'bigint', 'symbol'].includes(typeof response)) {
		return {
			value: String(response),
			status: 'unset' as const,
			contentType: 'text/plain',
		}
	}
	if (Buffer.isBuffer(response)) {
		return {
			value: response,
			status: 'unset' as const,
			contentType: 'application/octet-stream',
		}
	}
	return {
		value: JSON.stringify(response, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
		status: 'unset' as const,
		contentType: 'application/json; charset=utf-8',
	}
}
