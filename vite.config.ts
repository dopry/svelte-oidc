import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import pkg from './package.json' with { type: 'json' };
import { loadEnv } from 'vite';





export default defineConfig(({ mode }) => {

	const env = loadEnv(mode, process.cwd(), '');
	const defaultRedirectUri = mode == 'production'
		? 'https://darrelopry.com/svelte-oidc'
		: 'http://localhost:5000/';
	const defaultPostLogoutRedirectUri = mode == 'production'
		? 'https://darrelopry.com/svelte-oidc'
		: 'http://localhost:5000/';

	const OIDC_ISSUER = env.OIDC_ISSUER || 'https://dev-hvw40i79.auth0.com';
	const OIDC_CLIENT_ID =
		env.OIDC_CLIENT_ID || '5m4i3ZD9M3NqX4qQsB0nsBmCXb6OXBN2';
	const OIDC_REDIRECT_URI =
		env.OIDC_REDIRECT_URI || defaultRedirectUri;
	const OIDC_POST_LOGOUT_REDIRECT_URI =
		env.OIDC_POST_LOGOUT_REDIRECT_URI || defaultPostLogoutRedirectUri;

	return {
		plugins: [sveltekit()],
		server: {
			port: 5000
		},
		define: {
			'process.env.OIDC_ISSUER': JSON.stringify(OIDC_ISSUER),
			'process.env.OIDC_CLIENT_ID': JSON.stringify(OIDC_CLIENT_ID),
			'process.env.OIDC_REDIRECT_URI': JSON.stringify(OIDC_REDIRECT_URI),
			'process.env.OIDC_POST_LOGOUT_REDIRECT_URI': JSON.stringify(OIDC_POST_LOGOUT_REDIRECT_URI),
			'pkg.version': JSON.stringify(pkg.version),
		},
		test: {
			expect: { requireAssertions: true },
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'client',
						environment: 'browser',
						browser: {
							enabled: true,
							provider: 'playwright',
							instances: [{ browser: 'chromium' }]
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**'],
						setupFiles: ['./vitest-setup-client.ts']
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	}
});
