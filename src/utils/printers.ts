import { Node } from 'ts-morph'
import * as util from 'util'

export const debugNode = (node: Node | undefined) => {
	console.debug('Node:')
	if (!node) {
		console.debug('Node is undefined')
		return
	}
	console.debug({
		kind: node.getKindName(),
		text: node.getText(),
	})
	debugNodeChildren(node)
}

export const debugNodes = (nodes: Node[] | undefined) => {
	console.debug('Nodes:')
	if (!nodes) {
		console.debug('Nodes are undefined')
		return
	}
	nodes.forEach((node) => debugNode(node))
}

export const debugNodeChildren = (node: Node | undefined) => {
	console.debug('Children:')
	if (!node) {
		console.debug('Node is undefined')
		return
	}
	const values = node.getChildren().map((child) => ({
		kind: child.getKindName(),
		text: child.getText(),
	}))
	console.debug(values)
}

export const debugObject = (object: Record<any, any> | any) => {
	if (typeof object === 'object') {
		console.debug(util.inspect(object, { showHidden: false, depth: null, colors: true }))
	} else {
		console.debug(object)
	}
}
