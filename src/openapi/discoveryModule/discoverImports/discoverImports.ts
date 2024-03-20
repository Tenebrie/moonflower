import { SourceFile, SyntaxKind } from 'ts-morph'

type Props = {
	sourceFile: SourceFile
	originalName: string
}

export const discoverImportedName = ({ sourceFile, originalName }: Props): string | null => {
	const importDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.ImportDeclaration)
	const discoveredName = importDeclarations
		.filter((declaration) => {
			// declaration
			const importPathNode = declaration.getLastChildByKind(SyntaxKind.StringLiteral)
			if (!importPathNode) {
				return false
			}

			const importPath = importPathNode.getText()

			return (
				/tenebrie-framework/.test(importPath) ||
				process.env.NODE_ENV === 'test' ||
				process.env.NODE_ENV === 'development'
			)
		})
		.map((declaration) => {
			const routerImport = declaration
				.getDescendantsOfKind(SyntaxKind.ImportSpecifier)
				.filter((i) => i.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === originalName)[0]

			if (!routerImport) {
				return null
			}

			return routerImport.getLastChildByKindOrThrow(SyntaxKind.Identifier).getText()
		})
		.filter((declaration): declaration is NonNullable<typeof declaration> => declaration !== null)[0]

	if (!discoveredName) {
		return null
	}
	return discoveredName
}
