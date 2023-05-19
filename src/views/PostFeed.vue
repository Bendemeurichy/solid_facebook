<script setup lang="ts">
import type { Contact } from "@/views/HomeView.vue";
import  type { Metadata } from "@/views/AddPost.vue";
import { onMounted, ref, type Ref } from "vue";
import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import type * as RDF from "@rdfjs/types";
import { QueryEngine } from "@comunica/query-sparql";
import {
  getContainedResourceUrlAll, getFile,
  getSolidDataset,
  getStringNoLocale,
  getThing,
  getThingAll,
  getUrl,
  getUrlAll
} from "@inrupt/solid-client";
import { FOAF } from "@inrupt/vocab-common-rdf";

const session = getDefaultSession()
const webId = session.info.webId;
// Dit is de geauthenticeerde fetch functie uit het Solid session object.
const fetch = session.fetch
// Houdt de resulterende bindings van de SPARQL opvraging bij.
let bindings: Ref<RDF.Bindings[]> = ref([])
// Houdt de URL van het opgevraagde bestand bij.
let resourceURL = webId
const engine = new QueryEngine();

let posts = ref<Array<Metadata>>([]);
let currentPost = ref<Metadata>({});

async function fetchMetadataFiles() {
  const metadataContainerUrl = `${resourceURL!.split('/profile')[0]}/private/images/metadata/`;
  console.log("metadata container url "+metadataContainerUrl)
  try {
    const metadataContainerDataset = await getSolidDataset(metadataContainerUrl, { fetch });
    console.log("metadata container dataset "+metadataContainerDataset)
    // Get all metadata file URLs
    const metadataFileUrls = getContainedResourceUrlAll(metadataContainerDataset);
    console.log("metadata file urls "+metadataFileUrls)
    // Fetch metadata files and process them
    const metadataList = [];
    for (const metadataFileUrl of metadataFileUrls) {
      console.log("file url "+metadataFileUrl);
      const metadataDataset = await getSolidDataset(metadataFileUrl, { fetch });
      console.log("metadata dataset "+metadataDataset)
      const metadataThing = getThingAll(metadataDataset)[0];
      console.log("metadata thing "+metadataThing)
      if (!metadataThing) {
        throw new Error(`No metadata found in ${metadataFileUrl}`);
      }
      const metadata = {
        file: await fetchPrivateImage(getUrl(metadataThing, "http://xmlns.com/foaf/0.1/img")),
        title: getStringNoLocale(metadataThing, "http://xmlns.com/foaf/0.1/title"),
        description: getStringNoLocale(metadataThing, "http://xmlns.com/foaf/0.1/depiction"),
        tagged: getUrlAll(metadataThing, "http://xmlns.com/foaf/0.1/depicts"),
        author: getUrl(metadataThing, "http://xmlns.com/foaf/0.1/maker")
      };

      metadataList.push(metadata);
      console.log("metadata succesfully retrieved"+metadata.file)
    }

    return metadataList;
  } catch (error) {
    // If an error occurs (e.g., the path does not exist), return an empty list
    console.error("Error fetching metadata files:", error);
    return [];
  }
}

async function fetchPrivateImage(imageUrl:string) {
  try {
    // Fetch the image file from the Solid POD
    const imageFile = await getFile(imageUrl, { fetch });

    // Convert the fetched image to a Blob URL
    const blobUrl = URL.createObjectURL(imageFile);

    return blobUrl;
  } catch (error) {
    console.error("Error fetching private image:", error);
    return null;
  }
}


async function changeCurrentPost(post: Metadata){
  currentPost.value = post;
}

onMounted(async () => {
  posts.value = await fetchMetadataFiles();
})
</script>

<template>
  <main>
    <div class="addpost">
     <RouterLink to="/addPost"><button onclick="">Add new post</button></RouterLink>
    </div>
    <div class="postfeed">
      <h1 class="feedHeader">Your Posts</h1>
      <div v-if="posts.length===0">
        <p>You currently have no posts</p>
      </div>
      <div v-else class="verticalContainer postList">
        <div class="rowdiv">
          <div class="leftside">
            <div class="verticalcontainer">
              <tr v-for="post in posts" :key="post.title">
                <td class="contactField" @click="changeCurrentPost(post)"><img :src="post.file" alt="no picture" class="postPicture"/></td>
              </tr>
            </div>
          </div>
          <div class="rightside">
            <h1>Post details</h1>
            <div v-if="!currentPost.file">
              <p>Click on a post to view details</p>
            </div>
            <div v-else>
              <img :src="currentPost.file" alt="no picture" class="detailPicture">
              <h2 class="postDetails">Title: {{currentPost.title}}</h2>
              <h2 class="postDetails">Description: </h2>
              <p>{{currentPost.description}}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>

.postPicture{
    width: 50%;
    height: auto;
    border-radius: 10px;
}

.detailPicture{
    width: 100%;
    height: auto;
    border-radius: 10px;
}

</style>