<script setup lang="ts">
  import { handleIncomingRedirect, getDefaultSession } from '@inrupt/solid-client-authn-browser';
  import { ref } from 'vue';
  import { RouterLink, RouterView } from 'vue-router'
  import SolidAuth from './components/SolidAuth.vue'

  // Ophalen van het Solid session object.
  const session = getDefaultSession()

  // De loggedIn variabele houdt de login status bij, 
  // en update de pagina wanneer de status verandert.
  let loggedIn = ref(false);

  // De checkingLogin variabele houdt bij of onze initiële 
  // check voor login informatie is afgerond.
  let checkingLogin = ref(true);

  // Forceer hernieuwen van de pagina bij het veranderen van de login status.
  session.onLogin(() => loggedIn.value = true)
  session.onLogout(() => loggedIn.value = false)

  // Deze functie gaat na of we teruggestuurd zijn 
  // naar de huidige pagina door de Solid login pagina.
  handleIncomingRedirect({restorePreviousSession: true})
    .then(info => {
        // Update de status van de component voor 
        // de login status en de login check status
        // op basis van het resultaat van de functie.
        // Voor meer informatie kan je de documentatie bekijken op
        // https://docs.inrupt.com/developer-tools/api/javascript/solid-client-authn-browser/functions.html#handleincomingredirect
        let status = info?.isLoggedIn || false;
        if (status !== loggedIn.value) loggedIn.value = status
        if (info) checkingLogin.value = false;  
    }
  ) 
</script>

<template>
  <div>
    <header>
      <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />
    </header>
    <div class="wrapper">
      <div v-if="checkingLogin">
        <p>Loading Solid Session ...</p>
      </div>
      <div v-else>
        <SolidAuth :loggedIn="loggedIn" />
        <div v-if="loggedIn">
          <nav>
            <RouterLink to="/">Home</RouterLink>
            <RouterLink to="/query">Query</RouterLink>
          </nav>
          <RouterView />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
  width: 100%
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    justify-content: center;
    place-items: center;
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  .greetings {
    display: flex;
    justify-content: center;
  }

  nav {
    display: flex;
    justify-content: center;
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
