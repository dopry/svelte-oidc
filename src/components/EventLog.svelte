<script lang="ts">

import { getContext, onDestroy, onMount } from 'svelte';
import { OIDC_CONTEXT_CLIENT_PROMISE } from './OidcContext.svelte';
import { User, UserManager } from 'oidc-client-ts';

let logs: string[] = [];
const log = (message: string) => {
  logs = [...logs, message];
};

let accessTokenExpiredHandler = () => log('Access token expired');
let accessTokenExpiringHandler = () => log('Access token expiring');
let silentRenewErrorHandler = (e: Error) => log(`SilentRenewError: ${e.message}`);
let userLoadedHandler = (user: User) => log(`User loaded: ${JSON.stringify(user)}`);
let userSessionChangedHandler = () => log('User session changed');
let userSignedInHandler = () => log(`User signed in`);
let userSignedOutHandler = () => log('User signed out');
let userUnloadedHandler = () => log('User unloaded');
let userManager: UserManager | undefined = undefined;

// getContext must be called at the top level
const oidcPromise = getContext<Promise<UserManager>>(OIDC_CONTEXT_CLIENT_PROMISE);

onMount(async () => {
  userManager = await oidcPromise;
  if (!userManager || !userManager.events) return;
  userManager.events.addAccessTokenExpired(accessTokenExpiredHandler);
  userManager.events.addAccessTokenExpiring(accessTokenExpiringHandler);
  userManager.events.addSilentRenewError(silentRenewErrorHandler);
  userManager.events.addUserLoaded(userLoadedHandler);
  userManager.events.addUserSessionChanged(userSessionChangedHandler);
  userManager.events.addUserSignedIn(userSignedInHandler);
  userManager.events.addUserSignedOut(userSignedOutHandler);
  userManager.events.addUserUnloaded(userUnloadedHandler);
  userManager.revokeTokens
});

onDestroy(() => {
  if (userManager && userManager.events) {
    userManager.events.removeAccessTokenExpired(accessTokenExpiredHandler);
    userManager.events.removeAccessTokenExpiring(accessTokenExpiringHandler);
    userManager.events.removeSilentRenewError(silentRenewErrorHandler);
    userManager.events.removeUserLoaded(userLoadedHandler);
    userManager.events.removeUserSessionChanged(userSessionChangedHandler);
    userManager.events.removeUserSignedIn(userSignedInHandler);
    userManager.events.removeUserSignedOut(userSignedOutHandler);
    userManager.events.removeUserUnloaded(userUnloadedHandler);
  }
});
</script>

<div class="event-log">
  <h5>OIDC Event Log</h5>
  <ul>
    {#each logs as log, i (i)}
      <li>{log}</li>
    {/each}
  </ul>
</div>
