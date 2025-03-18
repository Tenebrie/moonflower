import { SourceFile, SyntaxKind } from 'ts-morph'

import { discoverImportedName } from '../discoverImports/discoverImports'

export const discoverRouters = (sourceFile: SourceFile) => {
	const routerClassName = discoverImportedName({
		sourceFile,
		originalName: 'Router',
	})

	if (!routerClassName) {
		return { named: [], anonymous: [] }
	}

	const routers = sourceFile
		.getDescendantsOfKind(SyntaxKind.NewExpression)
		.filter((exp) => exp.getFirstChildByKindOrThrow(SyntaxKind.Identifier).getText() === routerClassName)

	const namedRouters = routers.filter((node) => !!node.getFirstAncestorByKind(SyntaxKind.VariableDeclaration))
	const anonymousRouters = routers.filter(
		(node) => !!node.getFirstAncestorByKind(SyntaxKind.ExportAssignment),
	)

	return {
		named: namedRouters.map((node) =>
			node
				.getFirstAncestorByKindOrThrow(SyntaxKind.VariableDeclaration)
				.getFirstChildByKindOrThrow(SyntaxKind.Identifier)
				.getText(),
		),
		anonymous: anonymousRouters.map((node) =>
			node
				.getFirstAncestorByKindOrThrow(SyntaxKind.ExportAssignment)
				.getFirstChildByKindOrThrow(SyntaxKind.CallExpression),
		),
	}
}
