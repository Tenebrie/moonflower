import { SourceFile, SyntaxKind } from 'ts-morph'

export const discoverRouters = (sourceFile: SourceFile) => {
	const importDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.ImportDeclaration)
	const routerClassName = importDeclarations
		.filter((declaration) => {
			// declaration
			const importPathNode = declaration.getLastChildByKind(SyntaxKind.StringLiteral)
			if (!importPathNode) {
				return false
			}

			const importPath = importPathNode.getText()

			return /tenebrie-framework/.test(importPath) || /\..+\/[Rr]outer/.test(importPath)
		})
		.map((declaration) => {
			const routerImport = declaration
				.getDescendantsOfKind(SyntaxKind.ImportSpecifier)
				.filter((i) => i.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'Router')[0]

			if (!routerImport) {
				return null
			}

			return routerImport.getLastChildByKindOrThrow(SyntaxKind.Identifier).getText()
		})
		.filter((declaration): declaration is NonNullable<typeof declaration> => declaration !== null)[0]

	const routers = sourceFile
		.getDescendantsOfKind(SyntaxKind.NewExpression)
		.filter((exp) => exp.getFirstChildByKindOrThrow(SyntaxKind.Identifier).getText() === routerClassName)

	const namedRouters = routers.filter((node) => !!node.getFirstAncestorByKind(SyntaxKind.VariableDeclaration))
	const anonymousRouters = routers.filter(
		(node) => !!node.getFirstAncestorByKind(SyntaxKind.ExportAssignment)
	)

	return {
		named: namedRouters.map((node) =>
			node
				.getFirstAncestorByKindOrThrow(SyntaxKind.VariableDeclaration)
				.getFirstChildByKindOrThrow(SyntaxKind.Identifier)
				.getText()
		),
		anonymous: anonymousRouters.map((node) =>
			node
				.getFirstAncestorByKindOrThrow(SyntaxKind.ExportAssignment)
				.getFirstChildByKindOrThrow(SyntaxKind.CallExpression)
		),
	}
}
