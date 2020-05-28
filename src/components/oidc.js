import { writable } from 'svelte/store';
import { getContext } from 'svelte';

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
    const oidc = await getContext(OIDC_CONTEXT_CLIENT_PROMISE)
    const token = await oidc.signinSilent();
    accessToken.set(token.accessToken);
    idToken.set(token.idToken);
}

/**
 * Initiate Register/Login flow.
 *
 * @param {boolean} preserveRoute - store current location so callback handler will navigate back to it.
 * @param {string} callback_url - explicit path to use for the callback.
 */
export async function login(preserveRoute = true, callback_url = null) {
    const oidc = await getContext(OIDC_CONTEXT_CLIENT_PROMISE)
    const redirect_uri =  callback_url || getContext(OIDC_CONTEXT_REDIRECT_URI) || window.location.href;

    // try to keep the user on the same page from which they triggered login. If set to false should typically
    // cause redirect to /.
    const appState = (preserveRoute) ? { pathname: window.location.pathname, search: window.location.search } : {}
    await oidc.signinRedirect({ redirect_uri, appState });
}

/**
 * Log out the current user.
 *
 * @param {string} logout_url - specify the url to return to after login.
 */
export async function logout(logout_url = null) {
    // getContext(OIDC_CONTEXT_CLIENT_PROMISE) returns a promise.
    const oidc = await getContext(OIDC_CONTEXT_CLIENT_PROMISE)
    const returnTo = logout_url || getContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI) || window.location.href;
    accessToken.set('');
    oidc.signoutRedirect({ returnTo });
}