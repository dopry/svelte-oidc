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
        userInfo
    } from './oidc';

    // props.
    export let issuer;
    export let client_id;
    export let redirect_uri;
    export let post_logout_redirect_uri;

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
    };

    if (issuer.includes('auth0.com')) {
        settings.metadata = {
            // added to overcome missing value in auth0 .well-known/openid-configuration
            // see: https://github.com/IdentityModel/oidc-client-js/issues/1067
            // see: https://github.com/IdentityModel/oidc-client-js/pull/1068
            end_session_endpoint: `process.env.OIDC_ISSUER/v2/logout?client_id=process.env.OIDC_CLIENT_ID`,
        };
    }
    const userManager = new UserManager(settings);
    userManager.events.addUserLoaded(function () {
        const user = userManager.getUser();
        accessToken.set(user.access_token);
        idToken.set(user.id_token);
        userInfo.set(user.profile);
    });

    userManager.events.addUserUnloaded(function () {
        idToken.set('');
        accessToken.set('');
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
            // handle the redirect response.
            const response = await oidc.signinRedirectCallback();
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

        const user = await oidc.getUser();

        if (user && !!user) {
            isAuthenticated.set(true);
            console.log('user', user);
            accessToken.set(user.access_token);
            idToken.set(user.id_token);
            userInfo.set(user.profile);
        }
        isLoading.set(false);
    }
    async function handleOnDestroy() {}

    onMount(handleOnMount);
    onDestroy(handleOnDestroy);
</script>


<slot></slot>
