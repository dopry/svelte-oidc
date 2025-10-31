module.exports = {
	env: {
		browser: true,
		node: true,
		es6: true,
	},
	extends: ['eslint:recommended', 'prettier'],
	overrides: [
		{
			files: '*.svelte',
			processor: 'svelte/svelte',
		},
	],
	parserOptions: {
		ecmaVersion: 2019,
		sourceType: 'module',
	},
	plugins: ['svelte'],
};
