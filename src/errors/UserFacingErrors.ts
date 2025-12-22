import { BaseHttpError } from './BaseHttpError'
import { StatusCodes } from './StatusCodes'

export const MoonflowerError = BaseHttpError
export { StatusCodes as HttpStatusCodes }

export class ValidationError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.BAD_REQUEST, message)
	}
}

export class BadRequestError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.BAD_REQUEST, message)
	}
}

export class UnauthorizedError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.UNAUTHORIZED, message)
	}
}

export class NotFoundError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.NOT_FOUND, message)
	}
}

export class InternalServerError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.INTERNAL_SERVER_ERROR, message)
	}
}

export class ServiceUnavailableError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.SERVICE_UNAVAILABLE, message)
	}
}

// To be used later
// export const errorNameToStatusCode = (name: string): number => {
// 	switch (name) {
// 		case 'ValidationError':
// 			return StatusCodes.BAD_REQUEST
// 		case 'BadRequestError':
// 			return StatusCodes.BAD_REQUEST
// 		case 'UnauthorizedError':
// 			return StatusCodes.UNAUTHORIZED
// 	}
// 	return StatusCodes.INTERNAL_SERVER_ERROR
// }

// import { getReasonPhrase } from 'http-status-codes'
// export const errorNameToReason = (name: string): string => {
// 	return getReasonPhrase(errorNameToStatusCode(name) || 500)
// }
