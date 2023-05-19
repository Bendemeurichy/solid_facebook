<script setup lang="ts">
export type { Contact };
import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import { QueryEngine } from "@comunica/query-sparql";
import { onMounted, ref, type Ref } from "vue";
import type * as RDF from "@rdfjs/types";
import {
  createThing,
  getSolidDataset,
  getStringNoLocale,
  getThing,
  getThingAll,
  getUrl,
  saveSolidDatasetAt,
  removeThing,
  setStringNoLocale,
  setThing,
  setUrl, removeUrl, removeStringNoLocale
} from "@inrupt/solid-client";
import { FOAF } from "@inrupt/vocab-common-rdf";


type Contact = {
  webId: string | null;
  image: string | null;
  name: string | null;
};

//vars
const userName = ref("")
const profilePicture = ref("")
let namePresent = false
let newName = ""
let imagePresent = false
let newImage = ""
let contacts = ref<Array<Contact>>([]);
let newContactWebid = ""


// Haal de nodige informatie uit het Solid session object.
const session = getDefaultSession()
const webId = session.info.webId;
// Dit is de geauthenticeerde fetch functie uit het Solid session object.
const fetch = session.fetch
// Houdt de resulterende bindings van de SPARQL opvraging bij.
let bindings: Ref<RDF.Bindings[]> = ref([])
// Houdt de URL van het opgevraagde bestand bij.
let resourceURL = webId
const engine = new QueryEngine();



//get contact list
async function getContacts() {
  const profileUrl = webId;

  // Fetch the profile dataset
  const profileDataset = await getSolidDataset(profileUrl, { fetch });

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
}



//add contact
async function addContact(contactWebId:string) {
  const profileUrl = resourceURL;

  // Fetch the profile dataset
  const profileDataset = await getSolidDataset(profileUrl, { fetch });
  const profile = getThing(profileDataset, profileUrl);

  // Create a custom URL for the contact's Thing
  const contactThingUrl = `${profileUrl}contacts/${encodeURIComponent(contactWebId)}`;

  // Create a new Thing for the contact
  let contactThing = createThing({ url: contactThingUrl });

  // Set the contact's WebID and name
  contactThing = setUrl(contactThing, FOAF.knows, contactWebId);

  // Add the contact Thing to the profile dataset
  const updatedProfileDataset = setThing(profileDataset, contactThing);

  // Save the updated profile dataset
  await saveSolidDatasetAt(profileUrl, updatedProfileDataset, { fetch });
}





//change username
async function addOrPatchUsername(name:string) {
  const source = resourceURL
  const profileDataset = await getSolidDataset(source, {
    fetch: fetch,
  });

  const profileThing = getThing(profileDataset, source);

  // Check if the foaf:name property already exists
  const nameExists = getStringNoLocale(profileThing, FOAF.name);

  if (nameExists) {
    // Patch the existing foaf:name property
    const updatedProfile = setThing(
      profileDataset,
      setStringNoLocale(profileThing, FOAF.name, name)
    );
    await saveSolidDatasetAt(source, updatedProfile, {
      fetch: fetch,
    });
    console.log("foaf:name patched:", name);
  } else {
    // Add a new foaf:name property
    const newProfile = setThing(
      profileDataset,
      setStringNoLocale(profileThing, FOAF.name, name)
    );
    await saveSolidDatasetAt(source, newProfile, {
      fetch: fetch,
    });
    console.log("foaf:name added:", name);
  }
}

//update profile picture
async function addOrPatchImage( img:string) {
const source = resourceURL;
const profileDataset = await getSolidDataset(source, {
    fetch: fetch,
  });

  const profileThing = getThing(profileDataset, webId);

  // Check if the foaf:img property already exists
  const imgExists = getUrl(profileThing, FOAF.img);

  if (imgExists) {
    // Patch the existing foaf:img property
    const updatedProfile = setThing(
      profileDataset,
      setUrl(profileThing, FOAF.img, img)
    );
    await saveSolidDatasetAt(resourceURL, updatedProfile, {
      fetch: fetch,
    });
    console.log("foaf:img patched:", img);
  } else {
    // Add a new foaf:img property
    const newProfile = setThing(
      profileDataset,
      setUrl(profileThing, FOAF.img, img)
    );
    await saveSolidDatasetAt(resourceURL, newProfile, {
      fetch: fetch,
    });
    console.log("foaf:img added:", img);
  }
}

//remove contact
async function deleteContact(contactWebId:string) {
  const profileUrl = resourceURL;
  // Fetch the profile dataset
  const profileDataset = await getSolidDataset(profileUrl, { fetch });

  // Find the contact Thing in the dataset
  const contactThingUrl = `${profileUrl}contacts/${encodeURIComponent(contactWebId)}`;
  const contactThing = getThing(profileDataset, contactThingUrl);

  // Remove the contact Thing from the profile dataset
  const updatedProfileDataset = removeThing(profileDataset, contactThing);

  // Save the updated profile dataset
  await saveSolidDatasetAt(profileUrl, updatedProfileDataset, { fetch });
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



//GETNAME
const getName = async () => {
  // Initialize the Comunica engine
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
  const source = resourceURL
  if (!source) return;
  try{
    const query = `
      SELECT ?img
      WHERE {
        <${resourceURL}> <http://xmlns.com/foaf/0.1/img> ?img .
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


//CHECK IF USER HAS FOAF NAME

async function checkNameExists() {
  // Use the ASK query to check if the foaf:name exists
  const source = resourceURL
  if (!source) return;
  try{
  const query = `
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    ASK {
      <${webId}> foaf:name ?name.
    }
  `;

  const result = await engine.queryBoolean(query, { sources: [source] });

  // Retrieve the boolean value indicating whether the foaf:name exists
  const nameExists = result.valueOf();

  if (nameExists) {
    console.log('foaf:name already exists');
  } else {
    console.log('foaf:name does not exist');
  }

  return nameExists;}
  catch (e) {
    console.error(e)
  }
}


 //change username and request new name
 async function handleNewName() {
  if (newName) {
    await addOrPatchUsername(newName);
    userName.value = newName;
    newName = "";
  }
 }

 async function handleNewImage() {
  if (newImage) {
    await addOrPatchImage(newImage);
    profilePicture.value = newImage;
    newImage = "";
  }
 }

 async function handleNewContact() {
  if ( newContactWebid) {
    await addContact(newContactWebid);
    contacts.value=await getContacts();
    console.log("contacts"+contacts.value)
    newContactWebid = "";
  }
 }

  async function handleRemoveContact(contactWebId:string) {
    await deleteContact(contactWebId);
    contacts.value=await getContacts();
    console.log("contacts"+contacts.value)
  }

  onMounted(async () => {
    contacts.value= await getContacts();
    console.log("contacts: "+contacts.value.map((contact: any) => contact.name+" "+contact.webId+" "+contact.image))
    if(await checkNameExists()) {
      const name = await getName()
      if (typeof name === 'string') {
        userName.value = name;
        console.log('foaf:name:', name);
      } else {
        console.error('Unexpected value returned from getName function: ', name);
      }
    } else {
      console.log("no name found")
      namePresent = false
      userName.value = "no name found"
    }
    const img = await getProfilePicture()
    if (typeof img === 'string') {
      profilePicture.value = img
    } else {
      console.error('Unexpected value returned from getProfilePicture: ', img)
    }


  });


</script>

<template>
  <main>
    <div class="rowdiv">
      <div class ="leftside">
        <div class="username verticalContainer">
          <p>username is: {{userName}}</p>
          <form @submit.prevent="handleNewName">
            <label for="name">new name: </label>
            <input type="text" id="name" name="name" v-model="newName">
            <input type="submit" value="Change Username">
          </form>
        </div>
        <div class="profilepic">
          <h2 class="profileHeader">Profile picture: </h2>
          <img :src="profilePicture" alt="no picture" class="profilepic">
          <form @submit.prevent="handleNewImage">
              <label for="image">new image(url): </label>
              <input type="text" id="image" name="image" v-model="newImage" placeholder="place image link here">
              <input type="submit" value="Change Image" >
          </form>
        </div>

      </div>
      <div class ="rightside">
        <div class="contactlist">
          <h2 class="profileHeader">List of contacts</h2>
          <div v-if="contacts===[]">
            <p>No contacts found</p>
          </div>
          <div v-else class="verticalContainer contactList">
          <tr  v-for="contact in contacts" :key="contact.webId" class="contactElement">
            <td class="contactField"><img :src="contact.image" alt="no picture" class="contactPicture"/></td>
            <td class="contactField">{{contact.name===null? "no foaf:name defined on profile":contact.name}}</td>
            <td class="contactField"><button @click="handleRemoveContact(contact.webId)">delete</button></td>
          </tr>
          </div>
          <div class = verticalContainer>
          <form @submit.prevent="handleNewContact">
            <label for="contact">new contact: </label>
            <input type="text" id="webid" name="webid" v-model="newContactWebid" placeholder="webid">
            <input type="submit" value="Add Contact">
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style>


.rightside {
  display: flex;
  flex-direction: column;
  column-gap: 20px;
  justify-content: space-between;
  width: 60%;
    padding: 20px;
}
.leftside {
  display: flex;
  flex-direction: column;
  column-gap: 20px;
  justify-content: space-between;
    align-content: flex-start;
  width: 40%;
    height: fit-content;
    padding: 20px;
}
  .rowdiv {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    column-gap: 20px;
  }

  .profilepic {
    width: 200px;
    height: 200px;
  }
  .username {
      display: flex;
      column-gap: 20px;
      justify-content: space-between;
  }
    .profilepic {
        display: flex;
        flex-direction: column;
        column-gap: 20px;
        justify-content: space-between;
        border-radius: 50%;
  }
  .profileHeader {
    font-size: 1.5rem;
  }
  .verticalContainer {
    display: flex;
    flex-direction: column;
    column-gap: 20px;
    justify-content: space-between;
      margin: 10px;
  }

.contactPicture {
    width: 50px;
    height: 50px;
    border-radius: 50%;
  }

.contactList {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 80%;
    height: 200px;
    overflow-y: scroll;
  }

  .contactElement {
    border: 1px solid #00bd7e;
      border-radius: 10px;
    background: #282828;
    display: flex;
    flex-direction: row;
      align-content: center;
      vertical-align: center;
    justify-content: space-between;
    column-gap: 20px;
    margin: 10px;
      padding: 10px;
      height: fit-content;
      width: fit-content;
  }

  .contactField {
      width: fit-content;
      align-content: center;
      vertical-align: center;
    border: transparent;
  }

  button {
    border-radius: 20px;
      border: 1px solid #00bd7e;
    elevation: 12deg;
    background: #282828;
    padding: 5px;
      margin: 10px;
      color: white;
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
</style>