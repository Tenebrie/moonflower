import { Validator } from '../validators/types'

export const getMissingParamMessage = (
	result:
		| {
				name: string
				validator: Pick<Validator<unknown>, 'description' | 'errorMessage'>
		  }
		| {
				originalName: string
				validator: Pick<Validator<unknown>, 'description' | 'errorMessage'>
		  },
) => {
	const name = 'name' in result ? result.name : result.originalName
	const { description } = result.validator

	if (description) {
		return `'${name}' (${description})`
	}
	return `'${name}'`
}

export const getValidationResultMessage = (
	result:
		| {
				name: string
				validator: Pick<Validator<unknown>, 'description' | 'errorMessage'>
		  }
		| {
				originalName: string
				validator: Pick<Validator<unknown>, 'description' | 'errorMessage'>
		  },
) => {
	const name = 'name' in result ? result.name : result.originalName
	const { description, errorMessage } = result.validator

	if (errorMessage) {
		return `'${name}' (${errorMessage})`
	}
	if (description) {
		return `'${name}' (${description})`
	}
	return `'${name}'`
}

export const getMissingRawBodyMessage = (validator: Validator<unknown>) => {
	const { description } = validator

	if (description) {
		return `Missing request body (${description}).`
	}
	return 'Missing request body.'
}

export const getFailedRawBodyValidationMessage = (validator: Validator<unknown>) => {
	const { description, errorMessage } = validator

	if (errorMessage) {
		return `Failed request body validation (${errorMessage}).`
	}
	if (description) {
		return `Failed request body validation (${description}).`
	}
	return 'Failed request body validation.'
}
