<template>
  <div class="query">
    <h1>Query</h1>
    <form @submit.prevent="handleSubmit">
      <input id="resourceURLInput" type="text" v-model="resourceURL" />
      <input type="submit" value="Query resource" />
    </form>
    <br />
    <h2>
        Resulting bindings
      </h2>
      <table id="results">
        <tr>
          <td>?s</td>
          <td>?p</td>
          <td>?o</td>
        </tr>
        <tr v-for="(binding, index) in bindings" :key="index" >
          <td>{{ binding.get('s')?.value }}</td>
          <td>{{ binding.get('p')?.value }}</td>
          <td>{{ binding.get('o')?.value }}</td>
        </tr>
      </table>
    </div>
</template>

<style>
@media (min-width: 1024px) {
  .query {
    min-height: 100vh;
    min-width: 800px;
    display: flex;
    align-items: center;
    flex-direction: column;
  }
}

form {
  width: 800px;
}

#resourceURLInput {
  width: 70%;
}

table, th, td {
  border: 1px solid black;
}
</style>

<script setup lang="ts">
import { getDefaultSession } from '@inrupt/solid-client-authn-browser';
import { QueryEngine } from '@comunica/query-sparql'
import { ref, type Ref } from 'vue';
import type * as RDF from '@rdfjs/types';

// Haal de nodige informatie uit het Solid session object.
const session = getDefaultSession()
const webId = session.info.webId;
// Dit is de geauthenticeerde fetch functie uit het Solid session object.
const fetch = session.fetch

// Houdt de resulterende bindings van de SPARQL opvraging bij.
let bindings: Ref<RDF.Bindings[]> = ref([])

// Houdt de URL van het opgevraagde bestand bij.
let resourceURL = webId

async function handleSubmit() {
  const source = resourceURL 
  if (!source) return;
  try {
    // Zet de Comunica query engine op.
    const myEngine = new QueryEngine();
    
    // Voer de opvraging uit en verkrijg
    // de resulterende bindings als een array.
    const queryBindings = await (
      await myEngine.queryBindings(`
          SELECT * WHERE {
              ?s ?p ?o.
          } LIMIT 10`, {
          sources: [source],
          fetch: fetch,
      })
    ).toArray();

    // Sla het resultaat van de opvraging op.
    // De bindings in dit geval zijn voor de 
    // variabelen ?s, ?p en ?o.
    bindings.value = queryBindings || []
  } catch (e) {
    console.error(e)
  } 
}

</script>