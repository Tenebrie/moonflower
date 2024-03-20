/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Node, SyntaxKind, ts } from 'ts-morph'

import { ApiEndpointDocs } from '../../hooks/useApiEndpoint'
import { EndpointData } from '../types'
import {
	findNodeImplementation,
	getProperTypeShape,
	getShapeOfValidatorLiteral,
	getValidatorPropertyOptionality,
	getValidatorPropertyShape,
	getValidatorPropertyStringValue,
	getValuesOfObjectLiteral,
} from './nodeParsers'

export const parseEndpoint = (node: Node<ts.Node>, sourceFilePath: string) => {
	const parsedEndpointMethod = node
		.getFirstDescendantByKind(SyntaxKind.PropertyAccessExpression)!
		.getText()
		.split('.')[1]
		.toUpperCase()

	const endpointMethod = parsedEndpointMethod === 'DEL' ? 'DELETE' : parsedEndpointMethod

	const endpointText = node.getFirstDescendantByKind(SyntaxKind.StringLiteral)!.getText() ?? ''
	const endpointPath = endpointText.substring(1, endpointText.length - 1)

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

	// API documentation
	try {
		const entries = parseApiDocumentation(node)
		entries.forEach((param) => {
			endpointData[param.identifier] = param.value as string & string[]
		})
	} catch (err) {
		warningData.push({
			segment: 'api',
			error: err as Error,
		})
		console.error('Error', err)
	}

	// Request params
	try {
		endpointData.requestPathParams = parseRequestParams(node, endpointPath)
	} catch (err) {
		warningData.push({
			segment: 'path',
			error: err as Error,
		})
		console.error('Error', err)
	}

	// Request query
	try {
		endpointData.requestQuery = parseRequestObjectInput(node, 'useQueryParams')
	} catch (err) {
		warningData.push({
			segment: 'query',
			error: err as Error,
		})
		console.error('Error', err)
	}

	// Request headers
	try {
		endpointData.requestHeaders = parseRequestObjectInput(node, 'useHeaderParams')
	} catch (err) {
		warningData.push({
			segment: 'headers',
			error: err as Error,
		})
		console.error('Error', err)
	}

	// Raw request body
	try {
		const parsedBody = parseRequestRawBody(node)
		if (parsedBody) {
			endpointData.rawBody = parsedBody
		}
	} catch (err) {
		warningData.push({
			segment: 'rawBody',
			error: err as Error,
		})
		console.error('Error', err)
	}

	// Object request body
	try {
		endpointData.objectBody = parseRequestObjectInput(node, 'useRequestBody')
	} catch (err) {
		warningData.push({
			segment: 'objectBody',
			error: err as Error,
		})
		console.error('Error', err)
	}

	// Request response
	try {
		endpointData.responses = parseRequestResponse(node)
	} catch (err) {
		warningData.push({
			segment: 'response',
			error: err as Error,
		})
		console.error('Error', err)
	}

	return endpointData
}

const getHookNode = (
	endpointNode: Node<ts.Node>,
	hookName:
		| 'useApiEndpoint'
		| 'usePathParams'
		| 'useQueryParams'
		| 'useHeaderParams'
		| 'useRequestBody'
		| 'useRequestRawBody'
) => {
	const callExpressions = endpointNode.getDescendantsOfKind(SyntaxKind.CallExpression)
	const matchingCallExpressions = callExpressions.filter((node) => {
		return node.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === hookName
	})
	return matchingCallExpressions[0] ?? null
}

const parseApiDocumentation = (node: Node<ts.Node>) => {
	const hookNode = getHookNode(node, 'useApiEndpoint')
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
		value: typeof values[number]['value']
	}[]
}

const parseRequestParams = (node: Node<ts.Node>, endpointPath: string): EndpointData['requestPathParams'] => {
	const hookNode = getHookNode(node, 'usePathParams')
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

const parseRequestRawBody = (node: Node<ts.Node>): NonNullable<EndpointData['rawBody']> | null => {
	const hookNode = getHookNode(node, 'useRequestRawBody')
	if (!hookNode) {
		return null
	}
	const paramNode = hookNode.getFirstChildByKind(SyntaxKind.SyntaxList)!
	const valueNode = findNodeImplementation(paramNode.getLastChild()!)

	return {
		signature: getValidatorPropertyShape(valueNode),
		optional: getValidatorPropertyOptionality(valueNode),
		description: getValidatorPropertyStringValue(valueNode, 'description'),
		errorMessage: getValidatorPropertyStringValue(valueNode, 'errorMessage'),
	}
}

const parseRequestObjectInput = (
	node: Node<ts.Node>,
	nodeName: 'useQueryParams' | 'useHeaderParams' | 'useRequestBody'
): EndpointData['requestQuery'] | EndpointData['objectBody'] => {
	const hookNode = getHookNode(node, nodeName)
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

	// TODO: Add support for response descriptions and errors
	if (typeof responseType === 'string') {
		return [
			{
				status: responseType === 'void' || responseType === 'null' ? 204 : 200,
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
					signature: responseType[0].shape,
					description: '',
					errorMessage: '',
				},
			]
		}

		return responseType[0].shape.map((unionEntry) => ({
			status: unionEntry.shape === 'void' || unionEntry.shape === 'null' ? 204 : 200,
			signature: unionEntry.shape,
			description: '',
			errorMessage: '',
		}))
	}

	return [
		{
			status: 200,
			signature: responseType,
			description: '',
			errorMessage: '',
		},
	]
}
