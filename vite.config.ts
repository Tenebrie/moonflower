import { resolve } from 'path'
import { defineConfig, UserConfig } from 'vitest/config'

export const baseViteConfig: UserConfig = {
	test: {
		globals: true,
		setupFiles: 'src/setupTests.ts',
	},
	resolve: {
		alias: {
			'@src': resolve(__dirname, './src'),
		},
	},
}

export default defineConfig(baseViteConfig)
