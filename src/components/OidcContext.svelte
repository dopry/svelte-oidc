<script context="module">
	import { writable } from 'svelte/store';
    import { UserManager } from 'oidc-client';
	import { onMount, onDestroy } from 'svelte';

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
	 * Context used cross components
	 */
	let context = {}

	/**
	 * Refresh the accessToken using the silentRenew method (hidden iframe)
	 * @return bool indicated whether the token was refreshed, if false error will be set
	 * in the authError store.
	 */
	export async function refreshToken() {
		try {
		  await context.userManager.signinSilent();
		  return true;
		}
		catch (e) {
			// set error state for reactive handling
			authError.set(e.message);
			return false;
		}
	}

	/**
	 * Initiate Register/Login flow.
	 *
	 * @param {boolean} preserveRoute - store current location so callback handler will navigate back to it.
	 * @param {string} callback_url - explicit path to use for the callback.
	 */
	export async function login(preserveRoute = true, callback_url = null) {
		const redirect_uri = callback_url || context.redirect_uri || window.location.href;

		// try to keep the user on the same page from which they triggered login. If set to false should typically
		// cause redirect to /.
		const appState = preserveRoute
			? {
					pathname: window.location.pathname,
					search: window.location.search,
			  }
			: {};
		await context.userManager.signinRedirect({ redirect_uri, appState });
	}

	/**
	 * Log out the current user.
	 *
	 * @param {string} logout_url - specify the url to return to after login.
	 */
	export async function logout(logout_url = null) {
		const returnTo = logout_url || context.post_logout_redirect_uri ||	window.location.href;
		context.userManager.signoutRedirect({ returnTo });
	}
</script>

<script>
	// props.
	export let issuer;
	export let client_id;
	export let redirect_uri;
	export let post_logout_redirect_uri;
	export let metadata = {};
	export let scope = 'openid profile email';

	$: context.redirect_uri = redirect_uri
	$: context.post_logout_redirect_uri = post_logout_redirect_uri

	const settings = {
		authority: issuer,
		client_id,
		redirect_uri,
		post_logout_redirect_uri,
		response_type: 'code',
		scope,
		automaticSilentRenew: true,
		metadata,
	};

	function onUserLoaded(user) {
		isAuthenticated.set(true);
		accessToken.set(user.access_token);
		idToken.set(user.id_token);
		userInfo.set(user.profile);
	}

	const userManager = new UserManager(settings);
	userManager.events.addUserLoaded(onUserLoaded);

	userManager.events.addUserUnloaded(function() {
		isAuthenticated.set(false);
		idToken.set('');
		accessToken.set('');
		userInfo.set({});
    });

	userManager.events.addSilentRenewError(function(e) {
		authError.set(`SilentRenewError: ${e.message}`);
    });

	context.userManager = userManager;

    // Not all browsers support this, please program defensively!
    const params = new URLSearchParams(window.location.search);

	// Use 'error' and 'code' to test if the component is being executed as a part of a login callback. If we're not
	// running in a login callback, and the user isn't logged in, see if we can capture their existing session.
    if (!params.has('error') && !params.has('code') && !$isAuthenticated) {
        refreshToken();
    }

	async function handleOnMount() {
		const user = await context.userManager.getUser();
		if (user) {
			onUserLoaded(user);
		}

		// Check if something went wrong during login redirect
		// and extract the error message
		if (params.has('error')) {
			authError.set(new Error(params.get('error_description')));
		}

		// if code then login success
		if (params.has('code')) {
			// handle the callback
			const response = await context.userManager.signinCallback();
			let state = (response && response.state) || {};
			// Can be smart here and redirect to original path instead of root
            const url = state && state.targetUrl ? state.targetUrl : window.location.pathname;
			state = { ...state, isRedirectCallback: true };

			// redirect to the last page we were on when login was configured if it was passed.
			history.replaceState(state, '', url);
			// location.href = url;
			// clear errors on login.
			authError.set(null);
		}
		// if code was not set and there was a state, then we're in an auth callback and there was an error. We still
		// need to wrap the sign-in silent. We need to sit down and chart out the various success and fail scenarios and
		// what the uris loook like. I fear this may be problematic in other auth flows in the future.
		else if (params.has('state')) {
			const response = await context.userManager.signinCallback();
		}

		isLoading.set(false);
	}
	async function handleOnDestroy() {}

	onMount(handleOnMount);
	onDestroy(handleOnDestroy);
</script>

<slot />
