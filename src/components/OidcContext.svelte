<script context="module">
	import { writable } from 'svelte/store';
    import { getContext } from 'svelte';
    import oidcClient from 'oidc-client';
	const { UserManager } = oidcClient;
	import { onMount, onDestroy, setContext } from 'svelte';

	/**
	 * Stores
	 */
	export const isLoading = writable(true);
	export const isAuthenticated = writable(false);
	export const accessToken = writable('');
	export const idToken = writable('');
	export const userInfo = writable({});
	export const authError = writable(null);

	/**
	 * Context Keys
	 *
	 * using an object literal means the keys are guaranteed not to conflict in any circumstance (since an object only has
	 * referential equality to itself, i.e. {} !== {} whereas "x" === "x"), even when you have multiple different contexts
	 * operating across many component layers.
	 */
	export const OIDC_CONTEXT_CLIENT_PROMISE = {};
	export const OIDC_CONTEXT_REDIRECT_URI = {};
	export const OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI = {};

	/**
	 * Refresh the accessToken store.
	 */
	export async function refreshToken() {
		const oidc = await getContext(OIDC_CONTEXT_CLIENT_PROMISE);
		await oidc.signinSilent();
	}

	/**
	 * Initiate Register/Login flow.
	 *
	 * @param {boolean} preserveRoute - store current location so callback handler will navigate back to it.
	 * @param {string} callback_url - explicit path to use for the callback.
	 */
	export async function login(preserveRoute = true, callback_url = null) {
		const oidc = await getContext(OIDC_CONTEXT_CLIENT_PROMISE);
		const redirect_uri = callback_url || getContext(OIDC_CONTEXT_REDIRECT_URI) || window.location.href;

		// try to keep the user on the same page from which they triggered login. If set to false should typically
		// cause redirect to /.
		const appState = preserveRoute
			? {
					pathname: window.location.pathname,
					search: window.location.search,
			  }
			: {};
		await oidc.signinRedirect({ redirect_uri, appState });
	}

	/**
	 * Log out the current user.
	 *
	 * @param {string} logout_url - specify the url to return to after login.
	 */
	export async function logout(logout_url = null) {
		const oidc = await getContext(OIDC_CONTEXT_CLIENT_PROMISE);
		const returnTo = logout_url || getContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI) ||	window.location.href;
		oidc.signoutRedirect({ returnTo });
	}
</script>

<script>
	// props.
	export let issuer;
	export let client_id;
	export let redirect_uri;
	export let post_logout_redirect_uri;
	export let metadata = {};

	setContext(OIDC_CONTEXT_REDIRECT_URI, redirect_uri);
	setContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI, post_logout_redirect_uri);

	const settings = {
		authority: issuer,
		client_id,
		// response_type: 'id_token token',
		redirect_uri,
		post_logout_redirect_uri,
		response_type: 'code',
		scope: 'openid profile email',
		automaticSilentRenew: true,
        metadata
	};

	const userManager = new UserManager(settings);
    userManager.events.addUserLoaded(function (user) {
		isAuthenticated.set(true);
		accessToken.set(user.access_token);
		idToken.set(user.id_token);
		userInfo.set(user.profile);
	});

    userManager.events.addUserUnloaded(function () {
		isAuthenticated.set(false);
		idToken.set('');
		accessToken.set('');
		userInfo.set({});
    });

    userManager.events.addSilentRenewError(function (e) {
        authError.set(`silentRenewError: ${e.message}`);
    });

    let oidcPromise = Promise.resolve(userManager);

    setContext(OIDC_CONTEXT_CLIENT_PROMISE, oidcPromise);


	async function handleOnMount() {
		// on run onMount after oidc
        const oidc = await oidcPromise;

        // Not all browsers support this, please program defensively!
        const params = new URLSearchParams(window.location.search);

		// Check if something went wrong during login redirect
		// and extract the error message
		if (params.has('error')) {
			authError.set(new Error(params.get('error_description')));
		}

		// if code then login success
		if (params.has('code')) {
			// handle the callback
			const response = await oidc.signinCallback();
            let state = (response && response.state) || {}
			// Can be smart here and redirect to original path instead of root
            const url = state && state.targetUrl ? state.targetUrl : window.location.pathname;
			state = { ...state, isRedirectCallback: true };

			// redirect to the last page we were on when login was configured if it was passed.
            history.replaceState(state, "", url);
			// location.href = url;
			// clear errors on login.
			authError.set(null);
		}
		isLoading.set(false);
	}
	async function handleOnDestroy() {}

	onMount(handleOnMount);
	onDestroy(handleOnDestroy);
</script>


<slot></slot>
