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

export class ForbiddenError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.FORBIDDEN, message)
	}
}

export class MethodNotAllowedError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.METHOD_NOT_ALLOWED, message)
	}
}

export class ConflictError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.CONFLICT, message)
	}
}

export class GoneError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.GONE, message)
	}
}

export class UnprocessableEntityError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.UNPROCESSABLE_ENTITY, message)
	}
}

export class TooManyRequestsError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.TOO_MANY_REQUESTS, message)
	}
}

export class NotImplementedError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.NOT_IMPLEMENTED, message)
	}
}

export class BadGatewayError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.BAD_GATEWAY, message)
	}
}

export class ServiceUnavailableError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.SERVICE_UNAVAILABLE, message)
	}
}

export class GatewayTimeoutError extends BaseHttpError {
	constructor(message: string) {
		super(StatusCodes.GATEWAY_TIMEOUT, message)
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
