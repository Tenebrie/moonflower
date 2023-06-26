/* eslint-disable @typescript-eslint/no-non-null-assertion */
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

import { OpenApiManager } from '../manager/OpenApiManager'
import { ShapeOfProperty, ShapeOfType, ShapeOfUnionEntry } from './types'

export const findNodeImplementation = (node: Node): Node => {
	if (node.getKind() === SyntaxKind.Identifier) {
		const implementationNode = node.asKind(SyntaxKind.Identifier)!.getImplementations()[0]?.getNode()
		if (implementationNode) {
			const implementationParentNode = implementationNode.getParent()!
			const assignmentValueNode = implementationParentNode.getLastChild()!
			if (assignmentValueNode === node) {
				throw new Error('Recursive implementation found')
			}
			return findNodeImplementation(assignmentValueNode)
		}

		const definitionNode = node.asKind(SyntaxKind.Identifier)!.getDefinitions()[0]?.getNode()
		if (definitionNode) {
			const definitionParentNode = definitionNode.getParent()!
			const assignmentValueNode = definitionParentNode.getLastChild()!
			if (assignmentValueNode === node) {
				throw new Error('Recursive implementation found')
			}
			return findNodeImplementation(assignmentValueNode)
		}
		throw new Error('No implementation nor definition available')
	}

	return node
}

export const findPropertyAssignmentValueNode = (
	node:
		| PropertyAssignment
		| TypeReferenceNode
		| PropertySignature
		| PropertyAccessExpression
		| ShorthandPropertyAssignment
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
			child.getKind() !== SyntaxKind.SemicolonToken
	)!
}

export const getTypeReferenceShape = (node: TypeReferenceNode): ShapeOfType['shape'] => {
	const firstChild = node.getFirstChild()!
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
	return 'unknown_1'
}

export const getShapeOfValidatorLiteral = (
	objectLiteralNode: Node<ts.ObjectLiteralExpression>
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

export const getValidatorPropertyShape = (innerLiteralNode: Node): ShapeOfType['shape'] => {
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
			childCallExpressionNode.getFirstChildByKind(SyntaxKind.SyntaxList)!.getFirstChild()!
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
		return 'unknown_3'
	}

	// Attempting to infer type from `rehydrate` function
	const innerNodePropertyAssignments = innerLiteralNode
		.getFirstChildByKind(SyntaxKind.SyntaxList)!
		.getChildrenOfKind(SyntaxKind.PropertyAssignment)
	const rehydratePropertyAssignment = innerNodePropertyAssignments.find((prop) => {
		return prop.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'rehydrate'
	})
	if (rehydratePropertyAssignment) {
		const returnType = findPropertyAssignmentValueNode(rehydratePropertyAssignment)
			.asKind(SyntaxKind.ArrowFunction)!
			.getReturnType()
		return getProperTypeShape(returnType, rehydratePropertyAssignment)
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

	return 'unknown_2'
}

export const getValidatorPropertyOptionality = (node: Node): boolean => {
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
	name: 'description' | 'errorMessage'
): string => {
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
				SyntaxKind.StringLiteral
			)!
			return targetNode.getLiteralText()
		}
	}

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
	stack: Type[] = []
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

	if (type.isNull()) {
		return "'null'"
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

	if (type.isObject() && type.getProperties().length === 0) {
		const targetType = type.getAliasTypeArguments()[1]
		return [
			{
				role: 'record' as const,
				shape: getProperTypeShape(targetType, atLocation, nextStack),
				optional: false,
			},
		]
	}

	if (type.isObject()) {
		if (type.getText() === 'Date') {
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
			(type, index, arr) => !arr.find((dup, dupIndex) => dup.shape === type.shape && dupIndex > index)
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

	return 'unknown_5'
}

const getLiteralValueOfNode = (node: Node): string | string[] | undefined => {
	if (node.isKind(SyntaxKind.Identifier)) {
		return getLiteralValueOfNode(findNodeImplementation(node))
	} else if (node.isKind(SyntaxKind.StringLiteral)) {
		return node.getLiteralValue()
	} else if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
		return node.forEachChildAsArray().map((child) => getLiteralValueOfNode(child)) as string[]
	} else if (node.isKind(SyntaxKind.PropertyAccessExpression)) {
		return getLiteralValueOfNode(findPropertyAssignmentValueNode(node))
	}
	return 'unknown_6'
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
