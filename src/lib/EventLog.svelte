<script lang="ts">

import type { User, UserManager } from 'oidc-client-ts';
import { getContext, onDestroy, onMount } from 'svelte';
import { OIDC_CONTEXT_CLIENT_PROMISE } from './OidcContext.svelte';

let logs: string[] = [];
let userManager: UserManager | undefined = undefined;
let userLoadedHandler: (user: User) => void;
let userUnloadedHandler: () => void;

// getContext must be called at the top level
const oidcPromise = getContext<Promise<UserManager>>(OIDC_CONTEXT_CLIENT_PROMISE);

onMount(async () => {
  userManager = await oidcPromise;
  if (!userManager || !userManager.events) return;
  userLoadedHandler = (user) => {
    logs = [...logs, `User logged in: ${JSON.stringify(user)}`];
  };
  userUnloadedHandler = () => {
    logs = [...logs, 'User logged out'];
  };
  userManager.events.addUserLoaded(userLoadedHandler);
  userManager.events.addUserUnloaded(userUnloadedHandler);
});

onDestroy(() => {
  if (userManager && userManager.events) {
    if (userLoadedHandler) userManager.events.removeUserLoaded(userLoadedHandler);
    if (userUnloadedHandler) userManager.events.removeUserUnloaded(userUnloadedHandler);
  }
});
</script>

<div class="event-log">
  <h5>OIDC Event Log</h5>
  <ul>
    {#each logs as log, i}
      <li>{log}</li>
    {/each}
  </ul>
</div>
