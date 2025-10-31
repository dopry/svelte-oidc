import replace from '@rollup/plugin-replace';
import pkg from './package.json';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';

const production = !process.env.ROLLUP_WATCH;

const defaultRedirectUri = production ? 'https://darrelopry.com/svelte-oidc' : 'http://localhost:5000/';
const defaultPostLogoutRedirectUri = production ? 'https://darrelopry.com/svelte-oidc' : 'http://localhost:5000/';

export default {
	input: 'src/main.js',
	output:  { sourcemap: true,	format: 'iife',	name: 'app', file: 'public/bundle.js'  },
	plugins: [
		replace({
			"preventAssignment": true,
			'process.env.OIDC_ISSUER': process.env.OIDC_ISSUER || "https://dev-hvw40i79.auth0.com",
			'process.env.OIDC_CLIENT_ID': process.env.OIDC_CLIENT_ID || "5m4i3ZD9M3NqX4qQsB0nsBmCXb6OXBN2",
			'process.env.OIDC_REDIRECT_URI': process.env.OIDC_REDIRECT_URI ||  defaultRedirectUri,
			'process.env.OIDC_POST_LOGOUT_REDIRECT_URI': process.env.OIDC_POST_LOGOUT_REDIRECT_URI ||  defaultPostLogoutRedirectUri,
			'pkg.version': pkg.version
		}),
		svelte({ compilerOptions: { dev: true } }),
		nodeResolve({
			browser: true,
			dedupe: (importee) =>
				importee === 'svelte' || importee.startsWith('svelte/'),
		}),
		commonjs({
			include: ['node_modules/**'],
		}),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!production && livereload('public'),
	],
	watch: {
		clearScreen: false,
	},
};

function serve() {
	let started = false;

	return {
		writeBundle() {
			if (!started) {
				started = true;

				require('child_process').spawn(
					'npm',
					['run', 'start', '--', '--dev'],
					{
						stdio: ['ignore', 'inherit', 'inherit'],
						shell: true,
					}
				);
			}
		},
	};
}
