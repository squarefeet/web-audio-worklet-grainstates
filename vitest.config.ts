import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from "vitest/dist/config";

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			headless: true,
			name: 'chrome', // browser name is required
		},
		// logHeapUsage: true,
		reporters: 'default',
		benchmark: {
			include: ['**/*.bench.{js,ts}'],
		},
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'@test': fileURLToPath(new URL('./test', import.meta.url)),
		},
	},
})

