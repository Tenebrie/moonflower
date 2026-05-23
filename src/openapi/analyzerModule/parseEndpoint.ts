import { Node, SyntaxKind, ts } from 'ts-morph'

import { ApiEndpointDocs } from '../../hooks/useApiEndpoint'
import { Logger } from '../../utils/logger'
import { EndpointData } from '../types'
import {
	findNodeImplementation,
	getProperTypeShape,
	getShapeOfValidatorLiteral,
	getValidatorPropertyOptionality,
	getValidatorPropertyShape,
	getValidatorPropertyStringValue,
	getValuesOfObjectLiteral,
	resolveEndpointPath,
} from './nodeParsers'

export const parseEndpoint = (node: Node<ts.Node>, sourceFilePath: string) => {
	const parsedEndpointMethod = node
		.getFirstDescendantByKind(SyntaxKind.PropertyAccessExpression)!
		.getText()
		.split('.')[1]
		.toUpperCase()

	const endpointMethod = parsedEndpointMethod === 'DEL' ? 'DELETE' : parsedEndpointMethod

	const endpointPath = resolveEndpointPath(node) ?? ''

	const endpointData: EndpointData = {
		method: endpointMethod as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
		path: endpointPath,
		sourceFilePath,
		requestPathParams: [],
		requestQuery: [],
		requestHeaders: [],
		rawBody: undefined,
		objectBody: [],
		responses: [],
		name: undefined,
		summary: undefined,
		description: undefined,
		tags: undefined,
	}

	const warningData: {
		segment: string
		error: Error
	}[] = []

	const hookNodes = getHookNodes(node)

	// API documentation
	try {
		const entries = parseApiDocumentation(hookNodes.useApiEndpoint)
		entries.forEach((param) => {
			endpointData[param.identifier] = param.value as string & string[]
		})
	} catch (err) {
		warningData.push({
			segment: 'api',
			error: err as Error,
		})
		Logger.error('Error', err)
	}

	// Request params
	try {
		endpointData.requestPathParams = parseRequestParams(hookNodes.usePathParams, endpointPath)
	} catch (err) {
		warningData.push({
			segment: 'path',
			error: err as Error,
		})
		Logger.error('Error', err)
	}

	// Request query
	try {
		endpointData.requestQuery = parseRequestObjectInput(hookNodes.useQueryParams, 'useQueryParams')
	} catch (err) {
		warningData.push({
			segment: 'query',
			error: err as Error,
		})
		Logger.error('Error', err)
	}

	// Request headers
	try {
		endpointData.requestHeaders = parseRequestObjectInput(hookNodes.useHeaderParams, 'useHeaderParams')
	} catch (err) {
		warningData.push({
			segment: 'headers',
			error: err as Error,
		})
		Logger.error('Error', err)
	}

	// Raw request body
	try {
		const parsedBody = parseRequestRawBody(hookNodes.useRequestRawBody)
		if (parsedBody) {
			endpointData.rawBody = parsedBody
		}
	} catch (err) {
		warningData.push({
			segment: 'rawBody',
			error: err as Error,
		})
		Logger.error('Error', err)
	}

	// Object request body
	try {
		endpointData.objectBody = parseRequestObjectInput(hookNodes.useRequestBody, 'useRequestBody')
	} catch (err) {
		warningData.push({
			segment: 'objectBody',
			error: err as Error,
		})
		Logger.error('Error', err)
	}

	// Request response
	try {
		endpointData.responses = parseRequestResponse(node)
	} catch (err) {
		warningData.push({
			segment: 'response',
			error: err as Error,
		})
		Logger.error('Error', err)
	}

	return endpointData
}

type HookName =
	| 'useApiEndpoint'
	| 'usePathParams'
	| 'useQueryParams'
	| 'useHeaderParams'
	| 'useRequestBody'
	| 'useRequestRawBody'

const getHookNodes = (endpointNode: Node<ts.Node>): Record<HookName, Node<ts.CallExpression> | null> => {
	const result: Record<HookName, Node<ts.CallExpression> | null> = {
		useApiEndpoint: null,
		usePathParams: null,
		useQueryParams: null,
		useHeaderParams: null,
		useRequestBody: null,
		useRequestRawBody: null,
	}
	for (const node of endpointNode.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const name = node.getFirstChildByKind(SyntaxKind.Identifier)?.getText() as HookName | undefined
		if (name && name in result && result[name] === null) {
			result[name] = node
		}
	}
	return result
}

const parseApiDocumentation = (hookNode: Node<ts.CallExpression> | null) => {
	if (!hookNode) {
		return []
	}
	const paramNode = hookNode.getFirstChildByKind(SyntaxKind.SyntaxList)!
	const valueNode = findNodeImplementation(paramNode.getLastChild()!)

	if (!valueNode.isKind(SyntaxKind.ObjectLiteralExpression)) {
		throw new Error('Non-literal type used in useApiEndpoint')
	}

	const objectLiteral = valueNode.asKind(SyntaxKind.ObjectLiteralExpression)!

	const values = getValuesOfObjectLiteral(objectLiteral).filter((param) => param.value !== null)
	return values as {
		identifier: keyof ApiEndpointDocs
		value: (typeof values)[number]['value']
	}[]
}

const parseRequestParams = (
	hookNode: Node<ts.CallExpression> | null,
	endpointPath: string,
): EndpointData['requestPathParams'] => {
	if (!hookNode) {
		return []
	}

	const paramNode = hookNode.getFirstChildByKind(SyntaxKind.SyntaxList)!
	const valueNode = findNodeImplementation(paramNode.getLastChild()!)

	if (!valueNode.isKind(SyntaxKind.ObjectLiteralExpression)) {
		throw new Error('Non-literal type used in usePathParams')
	}

	const declaredParams = endpointPath
		.split('/')
		.filter((segment) => segment.startsWith(':'))
		.map((segment) => ({
			name: segment.substring(1).replace(/\?/, ''),
			optional: segment.includes('?'),
		}))

	const objectLiteral = valueNode.asKind(SyntaxKind.ObjectLiteralExpression)!
	return getShapeOfValidatorLiteral(objectLiteral)
		.filter((param) => param.shape !== null)
		.map((param) => ({
			identifier: param.identifier,
			signature: param.shape as string,
			optional: declaredParams.some((declared) => declared.name === param.identifier && declared.optional),
			description: param.description,
			errorMessage: param.errorMessage,
		}))
}

const parseRequestRawBody = (
	hookNode: Node<ts.CallExpression> | null,
): NonNullable<EndpointData['rawBody']> | null => {
	if (!hookNode) {
		return null
	}
	const paramNode = hookNode.getFirstChildByKind(SyntaxKind.SyntaxList)!
	const valueNode = findNodeImplementation(
		paramNode.getLastChild((node) => !node.isKind(SyntaxKind.CommaToken))!,
	)

	return {
		signature: getValidatorPropertyShape(valueNode),
		optional: getValidatorPropertyOptionality(valueNode),
		description: getValidatorPropertyStringValue(valueNode, 'description'),
		errorMessage: getValidatorPropertyStringValue(valueNode, 'errorMessage'),
	}
}

const parseRequestObjectInput = (
	hookNode: Node<ts.CallExpression> | null,
	nodeName: 'useQueryParams' | 'useHeaderParams' | 'useRequestBody',
): EndpointData['requestQuery'] | EndpointData['objectBody'] => {
	if (!hookNode) {
		return []
	}
	const paramNode = hookNode.getFirstChildByKind(SyntaxKind.SyntaxList)!
	const valueNode = findNodeImplementation(paramNode.getLastChild()!)

	if (!valueNode.isKind(SyntaxKind.ObjectLiteralExpression)) {
		throw new Error(`Non-literal type used in ${nodeName}`)
	}

	const objectLiteral = valueNode.asKind(SyntaxKind.ObjectLiteralExpression)!
	return getShapeOfValidatorLiteral(objectLiteral)
		.filter((param) => param.shape !== null)
		.map((param) => ({
			identifier: param.identifier,
			signature: param.shape as string,
			optional: param.optional,
			description: param.description,
			errorMessage: param.errorMessage,
		}))
}

const parseRequestResponse = (node: Node<ts.Node>): EndpointData['responses'] => {
	const implementationNode = node
		.getFirstChildByKind(SyntaxKind.CallExpression)!
		.getFirstChildByKind(SyntaxKind.SyntaxList)!
		.getFirstChildByKind(SyntaxKind.ArrowFunction)!
	const returnType = implementationNode.getReturnType()

	const actualType = (() => {
		if (returnType.getText().startsWith('Promise')) {
			return returnType.getTypeArguments()[0]
		}
		return returnType
	})()

	const responseType = getProperTypeShape(actualType, node)

	return parseResponseTypes(responseType)
}

const parseResponseTypes = (
	responseType: ReturnType<typeof getProperTypeShape>,
): EndpointData['responses'] => {
	// TODO: Add support for response descriptions and errors
	if (typeof responseType === 'string') {
		return [
			{
				status: responseType === 'void' || responseType === 'null' ? 204 : 200,
				contentType: 'text/plain',
				signature: responseType,
				description: '',
				errorMessage: '',
			},
		]
	}

	if (responseType[0].role === 'union_entry' || responseType[0].role === 'literal_string') {
		return parseResponseTypes(responseType[0].shape)
	}

	// Response type is a useReturnValue hook
	if (responseType[0].role === 'property' && responseType[0].identifier === '_isUseReturnValue') {
		const status = (() => {
			const property = responseType.find(
				(response) => response.role === 'property' && response.identifier === 'status',
			)?.shape
			if (!property || typeof property === 'string' || typeof property[0].shape !== 'string') {
				throw new Error('Invalid useReturnValue hook')
			}
			return parseInt(property[0].shape)
		})()
		const contentType = (() => {
			const property = responseType.find(
				(response) => response.role === 'property' && response.identifier === 'contentType',
			)?.shape
			if (!property || typeof property === 'string' || typeof property[0].shape !== 'string') {
				throw new Error('Invalid useReturnValue hook')
			}
			return property[0].shape
		})()
		return [
			{
				status,
				contentType,
				signature: responseType,
				description: '',
				errorMessage: '',
			},
		]
	}

	if (responseType[0].role === 'union') {
		if (typeof responseType[0].shape === 'string') {
			return [
				{
					status: responseType[0].shape === 'void' || responseType[0].shape === 'null' ? 204 : 200,
					contentType: 'application/json',
					signature: responseType[0].shape,
					description: '',
					errorMessage: '',
				},
			]
		}

		return responseType[0].shape.flatMap((unionEntry) => {
			return parseResponseTypes([unionEntry])
		})
	}

	if (responseType[0].role === 'buffer') {
		return [
			{
				status: 200,
				contentType: 'application/octet-stream',
				signature: responseType,
				description: '',
				errorMessage: '',
			},
		]
	}

	return [
		{
			status: 200,
			contentType: 'application/json',
			signature: responseType,
			description: '',
			errorMessage: '',
		},
	]
}
