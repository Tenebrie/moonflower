export type ApiEndpointDocs = {
	name?: string
	summary?: string
	description?: string
	tags?: string[]
}

export const useApiEndpoint = (docs: ApiEndpointDocs) => {
	return docs
}
