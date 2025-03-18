import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { defineConfig, ViteUserConfig } from 'vitest/config'

// Define all the entry points we want to bundle separately
const entries = {
	index: resolve(__dirname, 'src/index.ts'),
	'errors/HttpErrorHandler': resolve(__dirname, 'src/errors/HttpErrorHandler.ts'),
	'errors/UserFacingErrors': resolve(__dirname, 'src/errors/UserFacingErrors.ts'),
	'hooks/authentication/useAuth': resolve(__dirname, 'src/hooks/authentication/useAuth.ts'),
	'hooks/authentication/useOptionalAuth': resolve(__dirname, 'src/hooks/authentication/useOptionalAuth.ts'),
	'hooks/useApiEndpoint': resolve(__dirname, 'src/hooks/useApiEndpoint.ts'),
	'hooks/useApiHeader/useApiHeader': resolve(__dirname, 'src/hooks/useApiHeader/useApiHeader.ts'),
	'hooks/useCookieParams': resolve(__dirname, 'src/hooks/useCookieParams.ts'),
	'hooks/useExposeApiModel': resolve(__dirname, 'src/hooks/useExposeApiModel/useExposeApiModel.ts'),
	'hooks/useHeaderParams': resolve(__dirname, 'src/hooks/useHeaderParams.ts'),
	'hooks/usePathParams': resolve(__dirname, 'src/hooks/usePathParams.ts'),
	'hooks/useQueryParams': resolve(__dirname, 'src/hooks/useQueryParams.ts'),
	'hooks/useRequestBody': resolve(__dirname, 'src/hooks/useRequestBody.ts'),
	'hooks/useRequestRawBody': resolve(__dirname, 'src/hooks/useRequestRawBody.ts'),
	'hooks/useReturnValue': resolve(__dirname, 'src/hooks/useReturnValue.ts'),
	'openapi/initOpenApiEngine': resolve(__dirname, 'src/openapi/initOpenApiEngine.ts'),
	'router/Router': resolve(__dirname, 'src/router/Router.ts'),
	'validators/BuiltInValidators': resolve(__dirname, 'src/validators/BuiltInValidators.ts'),
	'validators/ParamWrappers': resolve(__dirname, 'src/validators/ParamWrappers.ts'),
}

export const baseViteConfig: ViteUserConfig = {
	build: {
		lib: {
			entry: entries,
			formats: ['es', 'cjs'],
			fileName: (format, entryName) => {
				// For the main index, use the original naming
				if (entryName === 'index') {
					return `index.${format === 'es' ? 'mjs' : 'cjs'}`
				}
				// For other entries, maintain the directory structure
				return `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
			},
		},
		rollupOptions: {
			external: [
				'koa',
				'@koa/router',
				'koa-bodyparser',
				'path',
				'fs',
				'fs/promises',
				'assert',
				'crypto',
				'perf_hooks',
				'@ts-morph/common',
				'typescript',
				'ts-morph',
			],
			output: {
				globals: {
					koa: 'Koa',
					'@koa/router': 'Router',
					'koa-bodyparser': 'bodyParser',
				},
				// Preserve directory structure in output
				preserveModules: true,
				preserveModulesRoot: 'src',
			},
		},
		sourcemap: true,
		outDir: 'dist',
		target: 'node18',
		commonjsOptions: {
			include: [/node_modules/],
		},
	},
	plugins: [
		dts({
			insertTypesEntry: true,
			include: ['src/**/*'],
		}),
	],
	resolve: {
		preserveSymlinks: true,
	},
	optimizeDeps: {
		exclude: ['@ts-morph/common', 'typescript', 'ts-morph'],
	},
	test: {
		globals: true,
		setupFiles: 'src/setupTests.ts',
		include: ['src/**/*.spec.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
		},
	},
}

export default defineConfig(baseViteConfig)
