# svelte-oidc

An Oidc Client Component for Svelte.

[Try out the demo](https://darrelopry.com/svelte-oidc/)

## Getting Started

Setup an OIDC Sever
 * https://www.ory.sh/
 * https://www.keycloak.org/
 * https://www.okta.com/
 * http://auth0.com/

 Get the authority and client_id

`npm install @dopry/svelte-oidc`

App.svelte
```
# App.svelte
import {
  OidcContext,
  authError,
  accessToken,
  idToken,
  isAuthenticated,
  isLoading,
  login,
  logout,
  userInfo,
} from '@dopry/svelte-oidc';

const metadata = {
            // added to overcome missing value in auth0 .well-known/openid-configuration
            // see: https://github.com/IdentityModel/oidc-client-js/issues/1067
            // see: https://github.com/IdentityModel/oidc-client-js/pull/1068
            end_session_endpoint: `process.env.OIDC_ISSUER/v2/logout?client_id=process.env.OIDC_CLIENT_ID`,
        };
</script>

<OidcContext
 issuer="https://dev-hvw40i79.auth0.com"
 client_id="aOijZt2ug6Ovgzp0HXdF23B6zxwA6PaP"
 redirect_uri="https://darrelopry.com/svelte-oidc/"
 post_logout_redirect_uri="https://darrelopry.com/svelte-oidc/"
 metadata={metadata}
 >

  <button on:click|preventDefault='{() => login() }'>Login</button>
  <button on:click|preventDefault='{() => logout() }'>Logout</button><br />
  <pre>isLoading: {$isLoading}</pre>
  <pre>isAuthenticated: {$isAuthenticated}</pre>
  <pre>authToken: {$accessToken}</pre>
  <pre>idToken: {$idToken}</pre>
  <pre>userInfo: {JSON.stringify($userInfo, null, 2)}</pre>
  <pre>authError: {$authError}</pre>
</OidcContext>
```

## Sapper/SSR

This component does not natively support SSR nor can it be used for authentication in server side rendered contexts. It
can be used within SSR applications as long as it is acceptable for all authentication to be client side. In order to
use for client side auth in an SSR application you will need to ensure it is not rendered server side as follows.

```
{#if process.browser} <OidcContext> ..... </OidcContext> {/if}
```

## Contributing

Contributors are Welcome. There is a lot of value in a vendor neutral OIDC component for use by the Svelte and Sapper
community. As a developer and product manager, I have needed to switch between Okta, Auth0, KeyCloak, IdentityServer,
and Ory on multiple occasions. Vendor specific libraries are usually riddled with vendor specific assumptions that make
the migration hard.

**How to Help!**

  * Better Documentation
  * Helping with the Issue Queue (support, good bug report, resolving bugs)
  * SSR Support
  * Automated Testing of all major identity providers

**PRs Welcome!**

## Docs

### Components
* OidcContext - component to initiate the OIDC client. You only need one instance in your DOM tree at the root.

  Attributes:
  * issuer - OIDC Authority/issuer/base url for .well-known/openid-configuration
  * client_id - OAuth ClientId
  * redirect_uri -  default: window.location.href
  * post_logout_redirect_uri - override the default url that OIDC will redirect to after logout. default: window.location.href
  * metadata - set default metadata or metadata missing from authority.

### Functions
* login(preseveRoute = true, callback_url = null) - begin a user login.
* logout(logout_url = null) - logout a user.
* refreshToken - function to refresh a token.

### Stores
* isLoading - if true OIDC Context is still loading.
* isAuthenticated - true if user is currently authenticated
* accessToken - access token for connecting to apis.
* idToken - identity token for getting user info easily.
* userInfo - the currently logged in user's info from OIDC userInfo endpoint
* authError - the last authentication error.

### Constants
* OIDC_CONTEXT_CALLBACK_URL
* OIDC_CONTEXT_CLIENT_PROMISE - key for the OIDC client in setContext/getContext.
* OIDC_CONTEXT_LOGOUT_URL,

## Development
npm run showcase:dev

## Release
**use semver**
1. npm publish
2. npm showcase:build
3. npm showcase:publish
