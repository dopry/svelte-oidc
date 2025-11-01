import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import svelte from 'rollup-plugin-svelte';
import { terser } from 'rollup-plugin-terser';
import { sveltePreprocess } from 'svelte-preprocess/dist/autoProcess';
import pkg from './package.json';

const name = pkg.name
	.replace(/^(@\S+\/)?(svelte-)?(\S+)/, '$3')
	.replace(/^\w/, (m) => m.toUpperCase())
	.replace(/-\w/g, (m) => m[1].toUpperCase());

export default {
	input: 'src/components/components.module.js',
	output: [
		{ file: pkg.module,	format: 'es', sourcemap: true, name },
		{ file: pkg.main, format: 'umd', sourcemap: true, name }
	],
	plugins: [
		svelte(
			{
				preprocess: sveltePreprocess({ sourceMap: false }),
				compilerOptions: { dev: false }
			}
		),
		nodeResolve({
			browser: true,
			dedupe: (importee) =>
				importee === 'svelte' || importee.startsWith('svelte/'),
		}),
		commonjs({
			include: ['node_modules/**'],
		}),
		terser(),
	]
};


