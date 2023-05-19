<script setup lang="ts">
export type {Metadata};
import { onMounted, ref } from "vue";
import type { Contact } from "@/views/HomeView.vue";
import { FOAF } from "@inrupt/vocab-common-rdf";
import {
 addStringNoLocale,
 addUrl,
 createSolidDataset,
 createThing, getSolidDataset, getSourceUrl, getThingAll, getUrl,
 overwriteFile, saveSolidDatasetAt, setStringNoLocale,
 setThing, setUrl
} from "@inrupt/solid-client";
import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import { QueryEngine } from "@comunica/query-sparql";

const postTitle = ref("");
const postDescription = ref("");
const postAuthor = ref("")
const tagged = ref<Array<string>>([])
const author = ref<string>("")

const selectedFile = ref<File|null>(null);
const imageUrl = ref<string | null>(null);
let contacts = ref<Array<Contact>>([]);
let authorlist = ref<Array<Contact>>([]);
const session = getDefaultSession()
const webId = session.info.webId;
const fetch = session.fetch
const engine = new QueryEngine()

function handleFileChange(event:Event) {
 const target = event.target as HTMLInputElement;
 if (target.files && target.files.length > 0) {
  selectedFile.value = target.files[0];
 }
 uploadImage();
}

function uploadImage() {
 if (!selectedFile.value) {
  return;
 }

 const reader = new FileReader();
 reader.onload = () => {
  if (typeof reader.result === 'string') {
   imageUrl.value = reader.result;
  }
 };

 reader.readAsDataURL(selectedFile.value);
};

async function getContacts() {
 // Fetch the profile dataset
 const profileDataset = await getSolidDataset(webId, { fetch });

 // Get all Things in the dataset
 const allThings = getThingAll(profileDataset);

 // Filter Things that have a foaf:knows property
 const contacts = allThings.filter(thing => getUrl(thing, FOAF.knows));

 // Create a list of contact objects with WebID and name
 const contactPromises = contacts.map(async contact => {
  const webId = getUrl(contact, FOAF.knows);
  console.log("adding image with " + webId);
  const img = await getContactProfilePicture(webId);
  console.log("image added " + img);
  return {
   webId: webId,
   image: img,
   name: await getContactPublicName(webId),
  };
 });

 // Wait for all promises to resolve and return the final result
 return Promise.all(contactPromises);
};

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
};

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
};

//GETNAME
const getName = async () => {
 // Initialize the Comunica engine
 const source = webId
 if (!source) return;
 try{

  // Define the SPARQL query to retrieve the foaf:name
  const sparqlQuery = `
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?name
    WHERE {
      <${source}> foaf:name ?name .
    }
  `;
  // Execute the query using the authorized fetch function
  const bindingsStream = await engine.queryBindings(sparqlQuery, { sources: [source], fetch: fetch });

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

async function getProfilePicture() {
 const source = webId
 if (!source) return;
 try{
  const query = `
      SELECT ?img
      WHERE {
        <${webId}> <http://xmlns.com/foaf/0.1/img> ?img .
      }
    `;
  const bindingsStream = await engine.queryBindings(query, { sources: [source], fetch: fetch });

  return new Promise((resolve, reject) => {
   let profilePic: string;
   bindingsStream.on('data', (binding) => {
    profilePic = binding.get('img').value;
   });
   bindingsStream.on('end', () => resolve(profilePic));
   bindingsStream.on('error', (error) => reject(error));
  });
 } catch (e) {
  console.error(e)
 };
};

type Metadata = {
 fetchedImage:string
  file: string,
 title: string,
 description: string,
 tagged: string[],
 author: string
};

//handling them files
async function uploadMetadata(metadataUrl: string, metadata: Metadata,imagetargetUrl:string) {
 // Create a new Thing for the metadata
 const metadataThing = createThing();

 // Add the metadata properties to the Thing
 const updatedMetadataThing = setUrl(setStringNoLocale(
   setUrl(setStringNoLocale(metadataThing, FOAF.title, metadata.title), FOAF.maker, metadata.author),
   FOAF.depiction, metadata.description),FOAF.img,imagetargetUrl);
 const updatedMetadataThing1 = metadata.tagged.reduce((thing, tag) => addUrl(thing, FOAF.depicts, tag), updatedMetadataThing);

 // Try to fetch the existing dataset, or create a new one if it doesn't exist
 let dataset;
 try {
  dataset = await getSolidDataset(metadataUrl, { fetch });
 } catch (error) {
  if (error.statusCode === 404) {
   dataset = createSolidDataset();
  } else {
   throw error;
  }
 }

 // Add the metadata Thing to the dataset
 dataset = setThing(dataset, updatedMetadataThing1);

 // Save the dataset to your Solid pod
 await saveSolidDatasetAt(metadataUrl, dataset, { fetch });
}


async function uploadImageToPod(imageFile:File, targetUrl:string) {
 // Read the image file as an ArrayBuffer
 const imageArrayBuffer = await new Promise((resolve, reject) => {
  const fileReader = new FileReader();
  fileReader.onload = () => resolve(fileReader.result);
  fileReader.onerror = reject;
  fileReader.readAsArrayBuffer(imageFile);
 });

 // Upload the image to your Solid pod
 try {
  const savedFile = await overwriteFile(
    targetUrl, // URL for the file.
    new Blob([imageArrayBuffer], { type: imageFile.type }), // Blob containing file data
    { fetch } // Fetch from the authenticated session
  );
  console.log(`File saved at ${getSourceUrl(savedFile)}`);
 } catch (error) {
  console.error(error);
 }
}

async function handleFiles() {

 // Set the target URLs for the image and metadata files
 const imageTargetUrl = `${webId.split('/profile')[0]}/private/images/image/${selectedFile.value!.name}.jpg`.replace(/\s/g, '');
 const metadataTargetUrl = `${webId.split('/profile')[0]}/private/images/metadata/${selectedFile.value!.name}.ttl`.replace(/\s/g, '');



 // Set the metadata
 const metadata = {
    file: imageTargetUrl,
   title: postTitle.value,
   author: postAuthor.value,
   tagged: tagged.value,
   description: postDescription.value
 };

 // Get the image file from your desktop (replace this with your actual file input)
 const imageFile = selectedFile.value;

 // Upload the image and metadata files
 await uploadImageToPod(imageFile, imageTargetUrl);
 await uploadMetadata(metadataTargetUrl, metadata,imageTargetUrl);

 console.log('Image and metadata uploaded successfully.');
}



onMounted(async () => {
 contacts.value = await getContacts();
 authorlist.value  = [... contacts.value];
 authorlist.value.push({webId:webId, name: await getName(), image: await getProfilePicture()});
});

</script>

<template>
 <h1>Add new post</h1>
 <form @submit.prevent="handleFiles">
 <div class="postimg">
  <h2>Select post image</h2>
  <input id="fileinput" type="file" accept="image/*" @change="handleFileChange" required>
  <img :src="imageUrl" v-if="imageUrl" class="image">
 </div>
  <div class="postauthor">
   <h2>Author</h2>
   <div class="authorcontainer">
   <div class="user" v-for="contact in authorlist">
    <input type="radio" :value="contact.webId" v-model="postAuthor" required>
    <img :src="contact.image" alt="no picture" class="contactPicture"/>
    <label>{{contact.name? contact.name:"no foaf:name defined in profile" }}</label>

   </div>
   </div>
  </div>
 <div class="posttitel">
  <h2>Title of your post</h2>
  <input v-model="postTitle" type="text" placeholder="title" required >
 </div>
 <div class="postdescription">
  <h2>Description</h2>
  <textarea v-model="postDescription" placeholder="description" required/>
 </div>
 <div class="tagged">
  <h2>Tagged people</h2>
  <div v-if="contacts===[]">
   <p>No contacts found</p>
  </div>
  <div v-else class="verticalContainer contactList">
   <tr  v-for="contact in contacts" :key="contact.webId" class="contactElement">
    <td class="contactField"><img :src="contact.image" alt="no picture" class="contactPicture"/></td>
    <td class="contactField">{{contact.name===null? "no foaf:name defined on profile":contact.name}}</td>
    <td class="contactField"><input type="checkbox" :id="contact.webId" :value="contact.webId" v-model="tagged"></td>
   </tr>
  </div>
  <input type="submit" value="Post">
 </div>
 </form>
 <RouterLink to="/feed"><button onclick="">Cancel</button></RouterLink>
</template>

<style scoped>
 .image {
  border-radius: 10px;
  width: 50%;
  height: auto;
 }
 .postimg {
  display: flex;
  flex-direction: column;
  align-items: start;
 }

 input {
  border-radius: 20px;
  border: 1px solid #00bd7e;
  elevation: 12deg;
  background: #282828;
  padding: 5px;
  margin: 10px;
  color: white;
 }
 .user{
  width: fit-content;
  padding: 10px;

 }
 .authorcontainer{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 5px;
  margin: 10px;
  padding: 10px;
  width: 100%;
 }
</style>