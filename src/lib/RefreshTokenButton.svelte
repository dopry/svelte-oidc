<script>
    import {  getContext } from 'svelte';
    import {
        OIDC_CONTEXT_CLIENT_PROMISE,
        refreshToken,
    } from './OidcContext.svelte';

    const oidcPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE)
    export let classes = ''
    export let styles = ''
</script>

<button class="btn {classes}" style="{styles}" on:click|preventDefault='{() => refreshToken(oidcPromise) }'><slot></slot></button>