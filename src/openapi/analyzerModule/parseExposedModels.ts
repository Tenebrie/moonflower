/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Node, SyntaxKind, ts } from 'ts-morph'

import { ExposedModelData } from '../types'
import { getProperTypeShape } from './nodeParsers'
import { ShapeOfProperty } from './types'

export const parseExposedModel = (node: Node<ts.Node>): ExposedModelData => {
	if (node.isKind(SyntaxKind.TypeReference)) {
		const identifierNode = node.getFirstChildByKind(SyntaxKind.Identifier)!
		const modelName = identifierNode.getText()
		const modelShape = getProperTypeShape(node.getType(), node, [])
		return {
			name: modelName,
			shape: modelShape,
		}
	}

	return {
		name: '',
		shape: '',
	}
}

export const parseNamedExposedModels = (node: Node<ts.Node>): ExposedModelData[] => {
	if (node.isKind(SyntaxKind.TypeLiteral)) {
		const shape = getProperTypeShape(node.getType(), node, []) as ShapeOfProperty[]
		return shape.map((property) => ({
			name: property.identifier,
			shape: property.shape,
		}))
	}
	return []
}
