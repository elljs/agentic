import { defineConfig } from 'tsup';

export default defineConfig([
	{
		entry: ['src/index.ts'],
		outDir: 'dist',
		target: 'node18',
		platform: 'node',
		format: ['cjs', 'esm'],
		splitting: false,
		sourcemap: true,
		minify: true,
		shims: true,
		dts: true,
	},
]);
