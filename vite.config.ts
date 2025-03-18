import { resolve } from 'path'
import { defineConfig, UserConfig } from 'vite'
import dts from 'vite-plugin-dts'

export const baseViteConfig: UserConfig = {
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			formats: ['es', 'cjs'],
			fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
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
				'ts-morph'
			],
			output: {
				globals: {
					koa: 'Koa',
					'@koa/router': 'Router',
					'koa-bodyparser': 'bodyParser',
				},
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
		alias: {
			'@src': resolve(__dirname, './src'),
		},
		preserveSymlinks: true,
	},
	optimizeDeps: {
		exclude: ['@ts-morph/common', 'typescript', 'ts-morph']
	}
}

export default defineConfig(baseViteConfig)
