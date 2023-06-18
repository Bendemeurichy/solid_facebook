# Solid webapplicatie sjabloon

Hier vind je twee voorbeelden van een minimale
Solid webtoepassing voor [Vue.js](https://vuejs.org/) en [React](https://react.dev/).
Beide zijn functioneel identiek
en geven een voorbeeld van hoe zaken zoals inloggen met Solid,
private RDF documenten bevragen met Comunica,
en nagiveren tussen paginas zonder opnieuw te moeten inloggen
kunnen geïmplementeerd worden met deze raamwerken.

Je bent vrij om deze voorbeelden of stukken code ervan te hergebruiken
voor het ontwikkelen van je eigen Solid webtoepassing.

## Opzetten van de toepassing

### Installeren en opstarten van het React sjabloon

```
# Clone de sjablonen vanop github
git clone git@github.ugent.be:WebDevelopment/SolidApplicationTemplate.git

# Navigeer naar het react sjabloon
cd SolidApplicationTemplate/react/

# Installeer van de nodige afhankelijkheden
npm install;

# Start de React webtoepassing.
npm start;
```

### Installeren en opstarten van het Vue.js sjabloon

```
# Clone de sjablonen vanop github
git clone git@github.ugent.be:WebDevelopment/SolidApplicationTemplate.git

# Navigeer naar het Vue.js sjabloon
cd SolidApplicationTemplate/vue/

# Installeer van de nodige afhankelijkheden
npm install;

# Start de Vue.js webtoepassing.
npm start;
```

## Uitleg bij de componenten

### App (src/App) {#app}

De `App` component is root-component van je toepassing.
Hierin behandelen we het terugkeren van de Solid
login-flow om te kijken of de gebruiker ingelogd is
met de `handleIncomingRedirect` functie.
Als de gebruiker niet ingelogd is, geven we
het login-scherm weer met de [`SolidAuth`](#solidauth) component.
Indien wel dan geven we het hoofdscherm van de toepassing weer.

### SolidAuth (src/components/SolidAuth) {#solidauth}

De `SolidAuth` component behandelt het inloggen
en uitloggen van de gebruiker voor de webtoepassing.
Wanneer de gebruiker niet ingelogd is,
wordt een logischerm weergegeven.
Wanneer de gebruiker ingelogd is,
wordt de WebID van de gebruiker
weergegeven samen met een `logout` knop.

### Query (src/components/Query) {#query}

De `Query` component behandelt het opvragen
van publieke en private bestanden op je
Solid pod met SPARQL opvragingen.
De resulterende bindings van de variabelen
uit de opvraging worden weergeven in de tabel.
