module.exports = {
	parser: '@typescript-eslint/parser',
	plugins: [
		'svelte3',
		'@typescript-eslint'
	],
	env: {
		browser: true,
		node: true,
		es6: true,
	},
	extends: ['eslint:recommended', 'prettier'],
	overrides: [
		{
			files: '*.svelte',
			processor: 'svelte3/svelte3',
		},
	],
	parserOptions: {
		ecmaVersion: 2019,
		sourceType: 'module',
	},
	settings: {
		'svelte3/typescript': true
	}
};
