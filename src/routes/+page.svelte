<script>
import { browser } from '$app/environment';
import { Highlight } from "svelte-highlight";
import json from "svelte-highlight/languages/json";
import {
	EventLog,
	LoginButton,
	LogoutButton,
	OidcContext,
	RefreshTokenButton,
	accessToken,
	authError,
	idToken,
	isAuthenticated,
	isLoading,
	userInfo,
} from '../lib/index.js';

let styles = ""
let classes = ""
const changeColor = (event) => {
  classes = ''
  styles = 'background-color: ' + event.target.value + ';'
}

const addClass = () => {
  classes = 'red'
}
</script>

<div class="container">
{#if browser}
<OidcContext
  issuer={process.env.OIDC_ISSUER}
  client_id={process.env.OIDC_CLIENT_ID}
  redirect_uri={process.env.OIDC_REDIRECT_URI}
  post_logout_redirect_uri={process.env.OIDC_POST_LOGOUT_REDIRECT_URI}
>
  <div class="row">
    <div class="col s12 m6">
      <LoginButton styles="{styles}" classes="{classes}">Login</LoginButton>
      <LogoutButton styles="{styles}" classes="{classes}">Logout</LogoutButton>
      <RefreshTokenButton styles="{styles}" classes="{classes}">refreshToken</RefreshTokenButton>
    </div>
    <div class="col s12 m6">
      <div class="row">
          <input
                  type="color"
                  id="login-btn-color"
                  name="login-btn-color"
                  value="#26a69a"
                  on:change={changeColor}
          />
          <label for="login-btn-color">Change Button Colors via styles</label>
      </div>
      <div class="row">
        <button class="btn" on:click={addClass}>Change Button Colors via class attribute</button>
      </div>
    </div>
  </div>
  <div class="row">
    <table>
      <thead>
      <tr><th style="width: 20%;">store</th><th style="width: 80%;">value</th></tr>
      </thead>
      <tbody>
      <tr><td>isLoading</td><td>{$isLoading}</td></tr>
      <tr><td>isAuthenticated</td><td>{$isAuthenticated}</td></tr>
      <tr><td>accessToken</td><td style="word-break: break-all;">{$accessToken}</td></tr>
      <tr><td>idToken</td><td style="word-break: break-all;">{$idToken}</td></tr>
      <tr><td>userInfo</td><td><Highlight language={json} code={JSON.stringify($userInfo, null, 2) || ''} /></td></tr>
      <tr><td>authError</td><td>{$authError}</td></tr>
      </tbody>
    </table>
  </div>
   <div class="row">
    <EventLog />
  </div>
</OidcContext>
{/if}
</div>