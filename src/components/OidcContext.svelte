<script>
    import oidcClient from 'oidc-client';
    const { UserManager } = oidcClient;
    import { onMount, onDestroy, setContext, getContext } from 'svelte';
    import {
        OIDC_CONTEXT_REDIRECT_URI,
        OIDC_CONTEXT_CLIENT_PROMISE,
        OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI,
        idToken,
        accessToken,
        isAuthenticated,
        isLoading,
        authError,
        userInfo,
    } from './oidc';

    // props.
    export let issuer;
    export let client_id;
    export let redirect_uri;
    export let post_logout_redirect_uri;
    export let metadata = {};

    setContext(OIDC_CONTEXT_REDIRECT_URI, redirect_uri);
    setContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI, post_logout_redirect_uri);

    // getContext doesn't seem to return a value in OnMount, so we'll pass the oidcPromise around by reference.
    const settings = {
        authority: issuer,
        client_id,
        response_type: 'id_token token',
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
            state = {  ...state,  isRedirectCallback: true };

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
