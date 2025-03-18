import { StatusToReasonPhrase } from './ReasonPhrases'
import { StatusCodeValue } from './StatusCodes'

export interface HttpError {
	status: StatusCodeValue
	reason: string
	message: string
}

export class BaseHttpError extends Error implements HttpError {
	public reason: string

	constructor(
		public status: StatusCodeValue,
		public message: string,
	) {
		super(message)
		this.reason = StatusToReasonPhrase(status)
	}
}
