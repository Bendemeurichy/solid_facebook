<script setup lang="ts">

import { getDefaultSession } from '@inrupt/solid-client-authn-browser';
import { QueryEngine } from '@comunica/query-sparql'
import { onMounted, ref, type Ref } from "vue";
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
const getName = async () => {
  // Initialize the Comunica engine
  const myEngine = new QueryEngine();
  const source = resourceURL
  if (!source) return;
  try{

  // Define the SPARQL query to retrieve the foaf:name
  const sparqlQuery = `
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?name
    WHERE {
      <${resourceURL}> foaf:name ?name .
    }
  `;

  // Execute the query using the authorized fetch function
  const bindingsStream = await myEngine.queryBindings(sparqlQuery, { sources: [source], fetch: fetch });

  // Process the result to get the foaf:name
  return new Promise((resolve, reject) => {
    let name: string;
    bindingsStream.on('data', (binding) => {
      name = binding.get('name').value;
    });
    bindingsStream.on('end', () => resolve(name));
    bindingsStream.on('error', (error) => reject(error));
  });
} catch (e) {
  console.error(e)
}}

const userName = ref("")

  onMounted(async () => {
    const name = await getName()
    if (typeof name === 'string') {
      userName.value = name;
      console.log('foaf:name:', name);
    } else {
      console.error('Unexpected value returned from getName function:', name);
    }

  })



</script>

<template>
  <main>
  <p>username is: {{userName}}</p>

  </main>
</template>
