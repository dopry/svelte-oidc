<script>
    import {  getContext } from 'svelte';
    import {
        OIDC_CONTEXT_CLIENT_PROMISE,
        OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI,
        logout,
    } from './OidcContext.svelte';

    const oidcPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE)
    export let logout_url = getContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI)
    export let classes = ''
    export let styles = ''
</script>

<button class="btn {classes}" style="{styles}" on:click|preventDefault='{() => logout(oidcPromise, logout_url) }'><slot></slot></button>