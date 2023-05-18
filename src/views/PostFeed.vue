<script setup lang="ts">
import type { Contact } from "@/views/HomeView.vue";
import { ref, type Ref } from "vue";
import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import type * as RDF from "@rdfjs/types";
import { QueryEngine } from "@comunica/query-sparql";
import { getSolidDataset, getThingAll, getUrl } from "@inrupt/solid-client";
import { FOAF } from "@inrupt/vocab-common-rdf";

type Post = {
  title: string | null,
  description: string | null,
  author: string | null,
  tagged: [Contact] | null,
}

const session = getDefaultSession()
const webId = session.info.webId;
// Dit is de geauthenticeerde fetch functie uit het Solid session object.
const fetch = session.fetch
// Houdt de resulterende bindings van de SPARQL opvraging bij.
let bindings: Ref<RDF.Bindings[]> = ref([])
// Houdt de URL van het opgevraagde bestand bij.
let resourceURL = webId
const engine = new QueryEngine();

let posts = ref<Array<Post>>([]);

async function getPosts() {
  const profileUrl = resourceURL;

  const profileDataset = await getSolidDataset(profileUrl, { fetch });

  // Get all Things in the dataset
  const allThings = getThingAll(profileDataset);

  //const posts = allThings.filter(thing => getUrl(thing, post))
}

</script>

<template>
  <main>
    <div class="addpost">
     <RouterLink to="/addPost"><button onclick="">Add new post</button></RouterLink>
    </div>
    <div class="postfeed">
      <h1 class="feedHeader">Your Posts</h1>
      <div v-if="posts===[]">
        <p>You currently have no posts</p>
      </div>
      <div v-else class="verticalContainer postList">
        <p>TODO: display all images</p>
      </div>
    </div>
  </main>
</template>

<style scoped>

</style>