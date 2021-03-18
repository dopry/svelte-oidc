<script>
    import {  getContext } from 'svelte';
    import {
        OIDC_CONTEXT_CLIENT_PROMISE,
        OIDC_CONTEXT_REDIRECT_URI,
        login,
    } from './OidcContext.svelte';

    const oidcPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE)
    export let callback_url = getContext(OIDC_CONTEXT_REDIRECT_URI)
    export let preserveRoute
</script>

<button class="btn" on:click|preventDefault='{() => login(oidcPromise, preserveRoute, callback_url) }'><slot></slot></button>
