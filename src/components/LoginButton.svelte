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
    export let classes = ''
    export let styles = ''
</script>

<button class="btn {classes}" style="{styles}" on:click|preventDefault='{() => login(oidcPromise, preserveRoute, callback_url) }'><slot></slot></button>
