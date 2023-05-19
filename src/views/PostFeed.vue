<script setup lang="ts">
import type { Contact } from "@/views/HomeView.vue";
import  type { Metadata } from "@/views/AddPost.vue";
import { onMounted, ref, type Ref } from "vue";
import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import type * as RDF from "@rdfjs/types";
import { QueryEngine } from "@comunica/query-sparql";
import {
  deleteFile,
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
let currentAuthor = ref<Contact>({});
let currentTagged = ref<Array<Contact>>([]);

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
        fetchedImage: await fetchPrivateImage(getUrl(metadataThing, "http://xmlns.com/foaf/0.1/img")),
        file: getUrl(metadataThing, "http://xmlns.com/foaf/0.1/img"),
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

//get contact profile picture
async function getContactProfilePicture(profileUrl:string) {
  // Initialize the Comunica engine
  // Construct a SPARQL query to fetch the profile picture URL
  const query = `
    PREFIX foaf: <${FOAF.NAMESPACE}>
    SELECT ?img
    WHERE {
      ?person foaf:img ?img .
    }
    LIMIT 1
  `;

  // Execute the query using Comunica
  const bindingsStream = await engine.queryBindings(query, {
    sources: [profileUrl],
  });

  // Get the profile picture URL from the query result
  let profilePictureUrl: unknown = null;

  return new Promise((resolve, reject) => {
    bindingsStream.on('data', (binding) => {
      profilePictureUrl = binding.get('img').value;
    });
    bindingsStream.on('end', () => resolve(profilePictureUrl));
    bindingsStream.on('error', (error) => reject(error));
  });
}

//get contact name
async function getContactPublicName(profileUrl: string) {
  // Initialize the Comunica engine
  // Construct a SPARQL query to fetch the public name
  const query = `
    PREFIX foaf: <${FOAF.NAMESPACE}>
    SELECT ?name
    WHERE {
      ?person foaf:name ?name .
    }
    LIMIT 1
  `;

  // Execute the query using Comunica
  const bindingsStream = await engine.queryBindings(query, {
    sources: [profileUrl],
  });

  // Get the public name from the query result
  let publicName: unknown = null;

  return new Promise((resolve, reject) => {
    bindingsStream.on('data', (binding) => {
      publicName = binding.get('name').value;
    });
    bindingsStream.on('end', () => resolve(publicName));
    bindingsStream.on('error', (error) => reject(error));
  });
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
  currentTagged.value = [];
  currentAuthor.value = {webId: post.author,image: await getContactProfilePicture(post.author),name: await getContactPublicName(post.author) }
  console.log("current post "+currentPost.value.title)
  for (const tagged of post.tagged) {
    currentTagged.value.push({webId: tagged,image: await getContactProfilePicture(tagged),name: await getContactPublicName(tagged) })
  }
};

async function deleteCurrentPost() {
  const metadataContainerUrl = `${resourceURL!.split('/profile')[0]}/private/images/metadata/`;
  const metadataFileUrl = currentPost.value.file.replace("/image/","/metadata/").replace(".jpg",".ttl");
  console.log("metadata file url "+metadataFileUrl)
  try {
    // Delete the metadata file
    await deleteFile(metadataFileUrl, { fetch });
    console.log("metadata file deleted")
    // Delete the image file
    await deleteFile(currentPost.value.file, { fetch });
    console.log("image file deleted")
    // Update the list of metadata files
    posts.value = await fetchMetadataFiles();
    console.log("metadata files updated")
    // Reset the current post
    currentPost.value = {};
    console.log("current post reset")
  } catch (error) {
    console.error("Error deleting metadata file:", error);
  }
};

onMounted(async () => {
  posts.value = await fetchMetadataFiles();
});
</script>

<template>
  <main>
    <div class="addpost">
     <RouterLink to="/addPost"><button onclick="">Add new post</button></RouterLink>
    </div>
    <div class="postfeed">
      <div v-if="posts.length===0">
        <p>No posts found</p>
      </div>
      <div v-else class="verticalContainer postList">
        <div class="rowdiv">
          <div class="leftside">
            <div class="verticalcontainer">
              <h1 class="feedHeader">Your Posts</h1>
              <tr v-for="post in posts" :key="post.title">
                <td class="contactField" @click="changeCurrentPost(post)"><img :src="post.fetchedImage" alt="no picture" class="postPicture"/></td>
              </tr>
            </div>
          </div>
          <div class="rightside">
            <h1>Post details</h1>
            <div v-if="!currentPost.file">
              <p>Click on a post to view details</p>
            </div>
            <div v-else>
              <h1 class="postDetails">{{currentPost.title}}</h1>
              <img :src="currentPost.fetchedImage" alt="no picture" class="detailPicture">
              <h2 class="postDetails">Description</h2>
              <p>{{currentPost.description}}</p>
              <h2 class="postDetails">Author</h2>
              <tr class="contactElement">
                <td class="contactField"><img :src="currentAuthor.image" alt="no picture" class="contactPicture"/></td>
                <td class="contactField">{{currentAuthor.name===null? "no foaf:name defined on profile":currentAuthor.name}}</td>
              </tr>
              <h2 class="postDetails">Tagged</h2>
              <div v-if="currentTagged.length===0">
                <p>No contacts tagged</p>
              </div>
              <div class="contactList" v-else>
              <tr  v-for="contact in currentTagged" :key="contact.webId" class="contactElement">
                <td class="contactField"><img :src="contact.image" alt="no picture" class="contactPicture"/></td>
                <td class="contactField">{{contact.name===null? "no foaf:name defined on profile":contact.name}}</td>
              </tr>
              </div>
              <button @click="deleteCurrentPost">Delete post</button>

            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.rightside{
    align-content: start;
  width: 100%;
  height: fit-content;
  overflow: auto;
}


.leftside,
.rightside {
    margin: 0;
    padding: 0;
    vertical-align: top;
}

.rowdiv {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-content: center;
}

.postPicture{
    width: 50%;
    height: auto;
    border-radius: 10px;
    border: 1px solid #00bd7e;
}

.detailPicture{
    width: 100%;
    height: auto;
    border-radius: 10px;
    border: 1px solid #00bd7e;
}

</style>