<template>
  <div>
    <div v-if="!props.loggedIn">
      <h1>
        Login
      </h1>
      <form @submit.prevent="handleLogin">
        <input type="text" v-model="textValueIDP" placeholder="identity provider" />
        <input type="submit" value="Login" />
      </form>
    </div>
    <div v-else class="centraldiv">
      <p style="display: inline-block; margin-right: 1em">
        Logged in as: {{ webid }}
      </p>
      <button @click.prevent="handleLogout">Logout</button>
    </div>
  </div>  
</template>

<style>
.centraldiv {
  display: flex;
  align-items: center;
  justify-content: center;
}
@media (min-width: 1024px) {
  .query {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>

<script setup lang="ts">
import { getDefaultSession } from '@inrupt/solid-client-authn-browser';
import { defineProps } from 'vue';

// Verkrijg login status van App component.
const props = defineProps({ loggedIn: Boolean })

// Haal het Solid session object op
let session = getDefaultSession()
let webid = session.info.webId

// Houdt de waarde van van het Identity Provider input-veld bij
let textValueIDP = ""

// Afhandelen van login oproep
function handleLogin() {

  // Verkrijg de Identity Provider waarde van het textveld.
  const idp = textValueIDP

  // Voer de aanvraag uit om in te loggen.
  // Voor meer informatie ga naar
  // https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate-browser/
  session.login({
    oidcIssuer: idp,
    redirectUrl: window.location.href,
    clientName: "Webdevelopment Practicum 3 Vue.js Template"
  })
}

// Afhandelen van logout oproep.
function handleLogout() {
  session.logout()
}
</script>