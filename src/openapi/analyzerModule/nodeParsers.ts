import {
	Node,
	PropertyAccessExpression,
	PropertyAssignment,
	PropertySignature,
	ShorthandPropertyAssignment,
	SyntaxKind,
	ts,
	Type,
	TypeReferenceNode,
} from 'ts-morph'

import { Logger } from '../../utils/logger'
import { OpenApiManager } from '../manager/OpenApiManager'
import { ShapeOfProperty, ShapeOfType, ShapeOfUnionEntry } from './types'

const implementationCache = new WeakMap<Node, Node>()

export const findNodeImplementation = (node: Node): Node => {
	const cached = implementationCache.get(node)
	if (cached) {
		return cached
	}

	if (node.getKind() === SyntaxKind.Identifier) {
		const implementationNode = node.asKind(SyntaxKind.Identifier)!.getImplementations()[0]?.getNode()
		if (implementationNode) {
			const implementationParentNode = implementationNode.getParent()!
			const assignmentValueNode = implementationParentNode.getLastChild()!
			if (assignmentValueNode === node) {
				throw new Error('Recursive implementation found')
			}
			const result = findNodeImplementation(assignmentValueNode)
			implementationCache.set(node, result)
			return result
		}

		const definitionNode = node.asKind(SyntaxKind.Identifier)!.getDefinitions()[0]?.getNode()
		if (definitionNode) {
			const definitionParentNode = definitionNode.getParent()!
			const assignmentValueNode = definitionParentNode.getLastChild()!
			if (assignmentValueNode === node) {
				throw new Error('Recursive implementation found')
			}
			const result = findNodeImplementation(assignmentValueNode)
			implementationCache.set(node, result)
			return result
		}
		throw new Error('No implementation nor definition available')
	}

	implementationCache.set(node, node)
	return node
}

export const findPropertyAssignmentValueNode = (
	node:
		| PropertyAssignment
		| TypeReferenceNode
		| PropertySignature
		| PropertyAccessExpression
		| ShorthandPropertyAssignment,
): Node => {
	const identifierChildren = node.getChildrenOfKind(SyntaxKind.Identifier)
	if (identifierChildren.length === 2) {
		return findNodeImplementation(identifierChildren[1])
	}
	const lastMatchingChild = node.getChildren().reverse()
	return lastMatchingChild.find(
		(child) =>
			child.getKind() !== SyntaxKind.GreaterThanToken &&
			child.getKind() !== SyntaxKind.CommaToken &&
			child.getKind() !== SyntaxKind.SemicolonToken,
	)!
}

export const getTypeReferenceShape = (node: TypeReferenceNode): ShapeOfType['shape'] => {
	const firstChild = node.getFirstChildByKind(SyntaxKind.SyntaxList)!
	if (firstChild.isKind(SyntaxKind.SyntaxList)) {
		return getRecursiveNodeShape(firstChild.getFirstChild()!)
	} else {
		return getRecursiveNodeShape(firstChild)
	}
}

export const getRecursiveNodeShape = (nodeOrReference: Node): ShapeOfType['shape'] => {
	const typeName = nodeOrReference.getSymbol()?.getName()
	if (typeName && OpenApiManager.getInstance().hasExposedModel(typeName)) {
		return [
			{
				role: 'ref',
				shape: typeName,
				optional: false,
			},
		]
	}

	const node = findNodeImplementation(nodeOrReference)

	// Undefined
	const undefinedNode = node.asKind(SyntaxKind.UndefinedKeyword)
	if (undefinedNode) {
		return 'undefined'
	}

	// Literal type
	const literalNode = node.asKind(SyntaxKind.LiteralType)
	if (literalNode) {
		if (literalNode.getFirstChildByKind(SyntaxKind.TrueKeyword)) {
			return 'true'
		}
		if (literalNode.getFirstChildByKind(SyntaxKind.FalseKeyword)) {
			return 'false'
		}
	}

	// Boolean literal
	const booleanLiteralNode =
		node.asKind(SyntaxKind.BooleanKeyword) ||
		node.asKind(SyntaxKind.TrueKeyword) ||
		node.asKind(SyntaxKind.FalseKeyword)
	if (booleanLiteralNode) {
		return 'boolean'
	}

	// String literal
	const stringLiteralNode = node.asKind(SyntaxKind.StringKeyword) || node.asKind(SyntaxKind.StringLiteral)
	if (stringLiteralNode) {
		return 'string'
	}

	// Number literal
	const numberLiteralNode = node.asKind(SyntaxKind.NumberKeyword) || node.asKind(SyntaxKind.NumericLiteral)
	if (numberLiteralNode) {
		return 'number'
	}

	// BigInt literal
	const bigIntNode = node.asKind(SyntaxKind.BigIntKeyword) || node.asKind(SyntaxKind.BigIntLiteral)
	if (bigIntNode) {
		return 'bigint'
	}

	// Type literal
	const typeLiteralNode = node.asKind(SyntaxKind.TypeLiteral)
	if (typeLiteralNode) {
		const properties = typeLiteralNode
			.getFirstChildByKind(SyntaxKind.SyntaxList)!
			.getChildrenOfKind(SyntaxKind.PropertySignature)

		const propertyShapes = properties.map((propNode) => {
			const identifier = propNode.getFirstChildByKind(SyntaxKind.Identifier)!
			const valueNode = findPropertyAssignmentValueNode(propNode)
			const questionMarkToken = identifier.getNextSiblingIfKind(SyntaxKind.QuestionToken)
			return {
				role: 'property' as const,
				identifier: identifier.getText(),
				shape: getRecursiveNodeShape(valueNode),
				optional: valueNode.getType().isNullable() || !!questionMarkToken,
			}
		})
		return propertyShapes
	}

	// Type reference
	const typeReferenceNode = node.asKind(SyntaxKind.TypeReference)
	if (typeReferenceNode) {
		return getRecursiveNodeShape(typeReferenceNode.getFirstChild()!)
	}

	// Property access expression
	const propertyAccessNode = node.asKind(SyntaxKind.PropertyAccessExpression)
	if (propertyAccessNode) {
		const lastChild = findNodeImplementation(node.getLastChild()!)
		return getProperTypeShape(lastChild.asKind(SyntaxKind.CallExpression)!.getReturnType(), lastChild)
	}

	// Union type
	const unionTypeNode = node.asKind(SyntaxKind.UnionType)
	if (unionTypeNode) {
		return getProperTypeShape(unionTypeNode.getType(), node)
	}

	// Typeof query
	const typeQueryNode = node.asKind(SyntaxKind.TypeQuery)
	if (typeQueryNode) {
		return getRecursiveNodeShape(typeQueryNode.getLastChild()!)
	}

	// Qualified name
	const qualifiedNameNode = node.asKind(SyntaxKind.QualifiedName)
	if (qualifiedNameNode) {
		return getRecursiveNodeShape(qualifiedNameNode.getLastChild()!)
	}

	// Call expression
	const callExpressionNode = node.asKind(SyntaxKind.CallExpression)
	if (callExpressionNode) {
		return getProperTypeShape(callExpressionNode.getReturnType(), callExpressionNode)
	}

	// Await expression
	const awaitExpressionNode = node.asKind(SyntaxKind.AwaitExpression)
	if (awaitExpressionNode) {
		return getRecursiveNodeShape(awaitExpressionNode.getChildAtIndex(1)!)
	}

	// 'As' Expression
	const asExpressionNode = node.asKind(SyntaxKind.AsExpression)
	if (asExpressionNode) {
		return getRecursiveNodeShape(asExpressionNode.getChildAtIndex(2)!)
	}

	// TODO
	const fileName = node.getSourceFile().getFilePath().split('/').pop()
	Logger.warn(`[${fileName}] Unknown node type: ${node.getKindName()}`)
	return 'unknown_1'
}

export const getShapeOfValidatorLiteral = (
	objectLiteralNode: Node<ts.ObjectLiteralExpression>,
): (ShapeOfProperty & { description: string; errorMessage: string })[] => {
	const syntaxListNode = objectLiteralNode.getFirstDescendantByKind(SyntaxKind.SyntaxList)!
	const assignmentNodes = syntaxListNode.getChildrenOfKind(SyntaxKind.PropertyAssignment)!

	const properties = assignmentNodes.map((node) => {
		const identifierNode = node.getFirstChild()!
		const identifierName = (() => {
			if (identifierNode.isKind(SyntaxKind.Identifier)) {
				return identifierNode.getText()
			}
			if (identifierNode.isKind(SyntaxKind.StringLiteral)) {
				return identifierNode.getLiteralText()
			}
			const fileName = node.getSourceFile().getFilePath().split('/').pop()
			Logger.warn(`[${fileName}] Unknown identifier name: ${identifierNode.getText()}`)
			return 'unknown_30'
		})()

		const assignmentValueNode = node.getLastChild()!
		const innerLiteralNode = findNodeImplementation(assignmentValueNode)

		return {
			role: 'property' as const,
			identifier: identifierName,
			shape: getValidatorPropertyShape(innerLiteralNode),
			optional: getValidatorPropertyOptionality(innerLiteralNode),
			description: getValidatorPropertyStringValue(innerLiteralNode, 'description'),
			errorMessage: getValidatorPropertyStringValue(innerLiteralNode, 'errorMessage'),
		}
	})

	return properties || []
}

const isZodCallExpression = (node: Node): boolean => {
	const callExpression = node.asKind(SyntaxKind.CallExpression)
	if (!callExpression) {
		return false
	}
	const returnType = callExpression.getReturnType()
	const typeName = returnType.getSymbol()?.getName() ?? ''
	return typeName.startsWith('Zod')
}

const getZodCallShape = (node: Node): ShapeOfType['shape'] => {
	const callExpression = node.asKind(SyntaxKind.CallExpression)!
	const returnType = callExpression.getReturnType()
	const typeName = returnType.getSymbol()?.getName() ?? ''

	if (typeName === 'ZodNumber') {
		return 'number'
	}
	if (typeName === 'ZodString') {
		return 'string'
	}
	if (typeName === 'ZodBoolean') {
		return 'boolean'
	}
	if (typeName === 'ZodBigInt') {
		return 'bigint'
	}

	if (typeName === 'ZodObject') {
		const argNode = callExpression.getFirstChildByKind(SyntaxKind.SyntaxList)?.getFirstChild()
		const objectLiteral = argNode?.asKind(SyntaxKind.ObjectLiteralExpression)
		if (!objectLiteral) {
			return 'unknown_zod_object'
		}
		const syntaxList = objectLiteral.getFirstChildByKind(SyntaxKind.SyntaxList)
		if (!syntaxList) {
			return []
		}
		const properties = syntaxList.getChildrenOfKind(SyntaxKind.PropertyAssignment)
		return properties.map((prop) => {
			const identifier = prop.getFirstChildByKind(SyntaxKind.Identifier)!.getText()
			const valueNode = prop.getLastChild()!
			return {
				role: 'property' as const,
				identifier,
				shape: isZodCallExpression(valueNode)
					? getZodCallShape(valueNode)
					: getValidatorPropertyShape(valueNode),
				optional: false,
			}
		})
	}

	if (typeName === 'ZodArray') {
		const argNode = callExpression.getFirstChildByKind(SyntaxKind.SyntaxList)?.getFirstChild()
		if (!argNode) {
			return 'unknown_zod_array'
		}
		const elementShape = isZodCallExpression(argNode)
			? getZodCallShape(argNode)
			: getValidatorPropertyShape(argNode)
		return [
			{
				role: 'array' as const,
				shape: elementShape,
				optional: false,
			},
		]
	}

	if (typeName === 'ZodEnum') {
		const typeArgs = returnType.getTypeArguments()
		if (typeArgs.length > 0) {
			const enumType = typeArgs[0]
			const properties = enumType.getProperties()
			const shapes: ShapeOfUnionEntry[] = properties.map((prop) => ({
				role: 'union_entry' as const,
				shape: getProperTypeShape(prop.getTypeAtLocation(callExpression), callExpression, []),
				optional: false,
			}))
			if (shapes.length === 1) {
				return shapes[0].shape
			}
			if (shapes.length > 1) {
				return [
					{
						role: 'union' as const,
						shape: shapes,
						optional: false,
					},
				]
			}
		}
		return 'unknown_zod_enum'
	}

	const fileName = node.getSourceFile().getFilePath().split('/').pop()
	Logger.warn(`[${fileName}] Unknown zod type: ${typeName}`)
	return 'unknown_zod'
}

export const getValidatorPropertyShape = (innerLiteralNode: Node): ShapeOfType['shape'] => {
	// Zod validator (e.g. z.number(), z.string(), z.object({...}), z.array(...))
	if (isZodCallExpression(innerLiteralNode)) {
		return getZodCallShape(innerLiteralNode)
	}

	// Inline definition with `as Validator<...>` clause
	const inlineValidatorAsExpression = innerLiteralNode
		.getParent()!
		.getFirstChildByKind(SyntaxKind.AsExpression)
	if (inlineValidatorAsExpression) {
		const typeReference = inlineValidatorAsExpression.getLastChildByKind(SyntaxKind.TypeReference)!
		return getTypeReferenceShape(typeReference)
	}

	// Variable with `: Validator<...>` clause
	const childTypeReferenceNode = innerLiteralNode.getParent()!.getFirstChildByKind(SyntaxKind.TypeReference)
	if (childTypeReferenceNode) {
		return getTypeReferenceShape(childTypeReferenceNode)
	}

	// `RequiredParam<...>` inline call expression
	if (innerLiteralNode.getParent()!.getChildrenOfKind(SyntaxKind.SyntaxList).length >= 2) {
		const typeNode = innerLiteralNode
			.getParent()!
			.getFirstChildByKind(SyntaxKind.SyntaxList)!
			.getFirstChild()!
		return getRecursiveNodeShape(typeNode)
	}

	// `RequestParam | RequiredParam | OptionalParam` call expression
	const childCallExpressionNode = innerLiteralNode.getParent()!.getFirstChildByKind(SyntaxKind.CallExpression)
	if (childCallExpressionNode) {
		const callExpressionArgument = findNodeImplementation(
			childCallExpressionNode.getFirstChildByKind(SyntaxKind.SyntaxList)!.getFirstChild()!,
		)

		// Param is a type reference
		const typeReferenceNode = callExpressionArgument
			.getParent()!
			.getFirstChildByKind(SyntaxKind.TypeReference)!
		if (typeReferenceNode) {
			return getProperTypeShape(typeReferenceNode.getType(), typeReferenceNode, [])
		}

		const thingyNode = callExpressionArgument
			.getParent()!
			.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression)!
		if (thingyNode) {
			return getValidatorPropertyShape(thingyNode)
		}

		if (callExpressionArgument.getKind() === SyntaxKind.CallExpression) {
			return getValidatorPropertyShape(callExpressionArgument)
		}

		if (callExpressionArgument.getKind() === SyntaxKind.IntersectionType) {
			return getValidatorPropertyShape(callExpressionArgument)
		}

		const fileName = innerLiteralNode.getSourceFile().getFilePath().split('/').pop()
		Logger.warn(`[${fileName}] Unknown call expression argument: ${callExpressionArgument.getKindName()}`)
		return 'unknown_3'
	}

	// Attempting to infer type from `parse` function
	const innerNodePropertyAssignments = innerLiteralNode
		.getFirstChildByKind(SyntaxKind.SyntaxList)!
		.getChildrenOfKind(SyntaxKind.PropertyAssignment)
	const parsePropertyAssignment = innerNodePropertyAssignments.find((prop) => {
		return prop.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'parse'
	})
	if (parsePropertyAssignment) {
		const returnType = findPropertyAssignmentValueNode(parsePropertyAssignment)
			.asKind(SyntaxKind.ArrowFunction)!
			.getReturnType()
		return getProperTypeShape(returnType, parsePropertyAssignment)
	}

	// Import statement
	const importTypeNode = innerLiteralNode
		.getFirstChildByKind(SyntaxKind.SyntaxList)
		?.getFirstChildByKind(SyntaxKind.ImportType)
	if (importTypeNode) {
		const indexOfGreaterThanToken = importTypeNode
			.getLastChildByKind(SyntaxKind.GreaterThanToken)!
			.getChildIndex()
		const targetSyntaxList = importTypeNode.getChildAtIndex(indexOfGreaterThanToken - 1)
		return getRecursiveNodeShape(targetSyntaxList.getFirstChild()!)
	}

	// Intersection type with Validator
	const intersectionType = innerLiteralNode.isKind(SyntaxKind.IntersectionType)
		? innerLiteralNode
		: innerLiteralNode.getParent()?.isKind(SyntaxKind.VariableDeclaration)
			? innerLiteralNode.getParent()?.getFirstChildByKind(SyntaxKind.IntersectionType)
			: null

	if (intersectionType) {
		const validatorType = intersectionType.getFirstChildByKind(SyntaxKind.TypeReference)
		if (validatorType) {
			return getTypeReferenceShape(validatorType)
		}
	}

	const fileName = innerLiteralNode.getSourceFile().getFilePath().split('/').pop()
	Logger.warn(`[${fileName}] Unknown import type node`)

	return 'unknown_2'
}

export const getValidatorPropertyOptionality = (node: Node): boolean => {
	if (isZodCallExpression(node)) {
		return false
	}

	const callExpressionNode = node.asKind(SyntaxKind.CallExpression)
	if (callExpressionNode) {
		const identifierNode = callExpressionNode.getFirstChildByKind(SyntaxKind.Identifier)
		if (identifierNode?.getText() === 'OptionalParam') {
			return true
		} else if (identifierNode?.getText() === 'RequiredParam') {
			return false
		}

		const syntaxListNode = callExpressionNode.getFirstChildByKind(SyntaxKind.SyntaxList)!
		const literalExpression = findNodeImplementation(syntaxListNode.getFirstChild()!)
		return getValidatorPropertyOptionality(literalExpression)
	}

	const syntaxListNode = node.getFirstDescendantByKind(SyntaxKind.SyntaxList)!
	const assignmentNodes = syntaxListNode.getChildrenOfKind(SyntaxKind.PropertyAssignment)!

	return assignmentNodes.some((node) => {
		const identifierNode = node.getFirstDescendantByKind(SyntaxKind.Identifier)!
		const identifierName = identifierNode.getText()

		if (identifierName === 'optional') {
			const value = findPropertyAssignmentValueNode(node)
			return value.getKind() === SyntaxKind.TrueKeyword
		}
		return false
	})
}

export const getValidatorPropertyStringValue = (
	nodeOrReference: Node,
	name: 'description' | 'errorMessage',
): string => {
	if (isZodCallExpression(nodeOrReference)) {
		return ''
	}

	const node = findNodeImplementation(nodeOrReference)

	const callExpressionNode = node.asKind(SyntaxKind.CallExpression)
	if (callExpressionNode) {
		const targetChild = callExpressionNode.getLastChildByKind(SyntaxKind.SyntaxList)!
		return getValidatorPropertyStringValue(targetChild, name)
	}

	const syntaxListNode = node.asKind(SyntaxKind.SyntaxList)
	if (syntaxListNode) {
		const children = syntaxListNode.getChildren().map((c) => getValidatorPropertyStringValue(c, name))
		return children.find((value) => !!value && value !== 'unknown_25') || ''
	}

	const objectLiteralNode = node.asKind(SyntaxKind.ObjectLiteralExpression)
	if (objectLiteralNode) {
		const values = getValuesOfObjectLiteral(objectLiteralNode)
		const targetValue = values.find((value) => value.identifier === name)
		if (!targetValue) {
			return ''
		}
		if (Array.isArray(targetValue.value)) {
			return 'array'
		}
		return targetValue.value || ''
	}

	const intersectionTypeNode = node.asKind(SyntaxKind.IntersectionType)
	if (intersectionTypeNode) {
		return (
			intersectionTypeNode
				.getTypeNodes()
				.flatMap((t) => getValidatorPropertyStringValue(t, name))
				.filter((v) => !!v && v !== 'unknown_25')[0] || 'unknown_27'
		)
	}

	const typeLiteralNode = node.asKind(SyntaxKind.TypeLiteral)
	if (typeLiteralNode) {
		return getValidatorPropertyStringValue(typeLiteralNode.getFirstChildByKind(SyntaxKind.SyntaxList)!, name)
	}

	const propertySignatureNode = node.asKind(SyntaxKind.PropertySignature)
	if (propertySignatureNode) {
		const identifier = node.getFirstDescendantByKind(SyntaxKind.Identifier)!
		if (identifier.getText() === name) {
			const targetNode = findPropertyAssignmentValueNode(propertySignatureNode).getFirstDescendantByKind(
				SyntaxKind.StringLiteral,
			)!
			return targetNode.getLiteralText()
		}
	}

	const fileName = node.getSourceFile().getFilePath().split('/').pop()
	Logger.dev(`[${fileName}] Unknown property string value node ${node.getKindName()}`)
	return 'unknown_25'
}

const isPromise = (type: Type) => {
	const symbol = type.getSymbol()
	if (!type.isObject() || !symbol) {
		return false
	}
	const args = type.getTypeArguments()
	return symbol.getName() === 'Promise' && args.length === 1
}

export const getProperTypeShape = (
	typeOrPromise: Type,
	atLocation: Node,
	stack: Type[] = [],
): ShapeOfType['shape'] => {
	const typeName = typeOrPromise.getAliasSymbol()?.getName()
	if (typeName && OpenApiManager.getInstance().hasExposedModel(typeName)) {
		return [
			{
				role: 'ref',
				shape: typeName,
				optional: false,
			},
		]
	}

	const type = isPromise(typeOrPromise) ? typeOrPromise.getTypeArguments()[0] : typeOrPromise

	if (stack.some((previousType) => previousType === type)) {
		return 'circular'
	}

	const nextStack = stack.concat(type)

	if (type.getText() === 'void') {
		return 'void'
	}

	if (type.isAny()) {
		return 'any'
	}

	if (type.isUnknown()) {
		return 'unknown'
	}

	if (type.isNull()) {
		return 'null'
	}

	if (type.isUndefined()) {
		return 'undefined'
	}

	if (type.isBoolean() || type.isBooleanLiteral()) {
		return 'boolean'
	}

	if (type.isStringLiteral()) {
		return [
			{
				role: 'literal_string' as const,
				shape: String(type.getLiteralValue()!),
				optional: false,
			},
		]
	}

	if (type.isNumberLiteral()) {
		return [
			{
				role: 'literal_number' as const,
				shape: String(type.getLiteralValue()!),
				optional: false,
			},
		]
	}

	if (type.isString() || type.isTemplateLiteral()) {
		return 'string'
	}

	if (type.isNumber()) {
		return 'number'
	}

	if (type.getText() === 'bigint') {
		return 'bigint'
	}

	if (type.isTuple()) {
		return [
			{
				role: 'tuple' as const,
				shape: type.getTupleElements().map((t) => ({
					role: 'tuple_entry' as const,
					shape: getProperTypeShape(t, atLocation, nextStack),
					optional: false,
				})),
				optional: false,
			},
		]
	}

	if (type.isArray()) {
		return [
			{
				role: 'array' as const,
				shape: getProperTypeShape(type.getArrayElementType()!, atLocation, nextStack),
				optional: false,
			},
		]
	}

	// Handles `interface Foo extends Array<T>` (e.g. Prisma's JsonArray)
	// which fails type.isArray() but is still array-like
	if (type.isObject()) {
		const arrayElementType = type.getNumberIndexType()
		const baseTypes = type.getBaseTypes()
		const arrayBase = baseTypes?.find((base) => base.isArray())
		if (arrayBase) {
			return [
				{
					role: 'array' as const,
					shape: getProperTypeShape(
						arrayBase.getArrayElementType() ?? arrayElementType!,
						atLocation,
						nextStack,
					),
					optional: false,
				},
			]
		}
	}

	const typeSymbolName = type.getSymbol()?.getName()

	const bufferLikeTypes = new Set([
		'Buffer',
		'Uint8Array',
		'Int8Array',
		'Uint8ClampedArray',
		'Int16Array',
		'Uint16Array',
		'Int32Array',
		'Uint32Array',
		'Float32Array',
		'Float64Array',
		'BigInt64Array',
		'BigUint64Array',
		'ArrayBuffer',
		'SharedArrayBuffer',
		'ReadableStream',
	])

	if (type.isObject() && typeSymbolName && bufferLikeTypes.has(typeSymbolName)) {
		return [
			{
				role: 'buffer' as const,
				shape: 'buffer',
				optional: false,
			},
		]
	}

	if (type.isObject() && typeSymbolName === 'RegExp') {
		return 'string'
	}

	if (type.isObject() && typeSymbolName === 'Map') {
		const typeArgs = type.getTypeArguments()
		const valueType = typeArgs[1]
		return [
			{
				role: 'record' as const,
				shape: valueType ? getProperTypeShape(valueType, atLocation, nextStack) : 'unknown',
				optional: false,
			},
		]
	}

	if (type.isObject() && typeSymbolName === 'Set') {
		const typeArgs = type.getTypeArguments()
		const elementType = typeArgs[0]
		return [
			{
				role: 'array' as const,
				shape: elementType ? getProperTypeShape(elementType, atLocation, nextStack) : 'unknown',
				optional: false,
			},
		]
	}

	if (type.isObject() && type.getProperties().length === 0) {
		const targetType = type.getAliasTypeArguments()[1] ?? type.getStringIndexType()
		if (targetType) {
			return [
				{
					role: 'record' as const,
					shape: getProperTypeShape(targetType, atLocation, nextStack),
					optional: false,
				},
			]
		}
	}

	if (type.isObject()) {
		if (typeSymbolName === 'Date' || type.getText() === 'Date') {
			return 'Date'
		}
		return type
			.getProperties()
			.map((prop) => {
				const valueDeclaration = prop.getValueDeclaration() || prop.getDeclarations()[0]!
				if (!valueDeclaration) {
					return {
						role: 'property' as const,
						identifier: prop.getName(),
						shape: getProperTypeShape(prop.getTypeAtLocation(atLocation), atLocation, nextStack),
						optional: false,
					}
				}
				const valueDeclarationNode =
					valueDeclaration.asKind(SyntaxKind.PropertySignature) ||
					valueDeclaration.asKind(SyntaxKind.PropertyAssignment) ||
					valueDeclaration.asKind(SyntaxKind.ShorthandPropertyAssignment)

				if (!valueDeclarationNode) {
					return {
						role: 'property' as const,
						identifier: prop.getName(),
						shape: getProperTypeShape(prop.getTypeAtLocation(atLocation), atLocation, nextStack),
						optional: false,
					}
				}

				const isOptional = prop.getTypeAtLocation(atLocation).isNullable()

				const shape = getProperTypeShape(prop.getTypeAtLocation(atLocation), atLocation, nextStack)
				return {
					role: 'property' as const,
					identifier: prop.getName(),
					shape: shape,
					optional: isOptional,
				}
			})
			.filter((val) => val.shape !== 'undefined')
	}

	if (type.isUnion()) {
		const unfilteredShapes: ShapeOfUnionEntry[] = type.getUnionTypes().map((type) => ({
			role: 'union_entry',
			shape: getProperTypeShape(type, atLocation, nextStack),
			optional: false,
		}))

		const dedupedShapes = unfilteredShapes.filter(
			(type, index, arr) => !arr.find((dup, dupIndex) => dup.shape === type.shape && dupIndex > index),
		)
		const isNullable = dedupedShapes.some((shape) => shape.shape === 'undefined')
		const shapes = dedupedShapes.filter((shape) => shape.shape !== 'undefined')
		if (shapes.length === 1) {
			return shapes[0].shape
		}
		return [
			{
				role: 'union',
				shape: shapes,
				optional: isNullable,
			},
		]
	}

	if (type.isIntersection()) {
		const children = type.getIntersectionTypes()
		const shapesOfChildren = children
			.map((child) => getProperTypeShape(child, atLocation, nextStack))
			.filter((shape) => typeof shape !== 'string') as ShapeOfProperty[][]
		return shapesOfChildren.reduce<ShapeOfType[]>((total, current) => [...total, ...current], [])
	}

	const fileName = atLocation.getSourceFile().getFilePath().split('/').pop()
	Logger.warn(`[${fileName}] Unknown type shape node ${typeOrPromise.getText()}`)
	return 'unknown_5'
}

const getLiteralValueOfNode = (node: Node): string | string[] | unknown[] => {
	if (node.isKind(SyntaxKind.Identifier)) {
		return getLiteralValueOfNode(findNodeImplementation(node))
	} else if (node.isKind(SyntaxKind.StringLiteral)) {
		return node.getLiteralValue()
	} else if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
		return node.forEachChildAsArray().map((child) => getLiteralValueOfNode(child)) as string[]
	} else if (node.isKind(SyntaxKind.PropertyAccessExpression)) {
		return getLiteralValueOfNode(findPropertyAssignmentValueNode(node))
	} else if (node.isKind(SyntaxKind.ObjectLiteralExpression)) {
		return getValuesOfObjectLiteral(node)
	}

	const fileName = node.getSourceFile().getFilePath().split('/').pop()
	Logger.dev(`[${fileName}] Unknown literal value node ${node.getKindName()}`)

	return 'unknown_6'
}

export const resolveEndpointPath = (node: Node): string | null => {
	const callExpression = node.getFirstDescendantByKind(SyntaxKind.CallExpression)
	if (!callExpression) return null

	const firstArg = callExpression.getArguments()[0]
	if (!firstArg) return null

	const argType = firstArg.getType()
	if (argType.isStringLiteral()) {
		return argType.getLiteralValue() as string
	}

	return null
}

export const getValuesOfObjectLiteral = (objectLiteralNode: Node<ts.ObjectLiteralExpression>) => {
	const syntaxListNode = objectLiteralNode.getFirstDescendantByKind(SyntaxKind.SyntaxList)!
	const assignmentNodes = syntaxListNode.getChildrenOfKind(SyntaxKind.PropertyAssignment)!

	const properties = assignmentNodes.map((node) => {
		const identifierNode = node.getFirstDescendantByKind(SyntaxKind.Identifier)!
		const identifierName = identifierNode.getText()

		const assignmentValueNode = node.getLastChild()!
		const targetNode = findNodeImplementation(assignmentValueNode)
		const value = getLiteralValueOfNode(targetNode)

		return {
			identifier: identifierName,
			value,
		}
	})

	return properties || []
}
