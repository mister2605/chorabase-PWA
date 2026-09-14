<script setup>
import { ref, onMounted } from 'vue'
import { fetchChorale } from '../api/membres'
import { fetchPupitres, fetchCategories } from '../api/chants'
import {
  renommerChorale,
  creerPupitre,
  renommerPupitre,
  supprimerPupitre,
  creerCategorie,
  renommerCategorie,
  supprimerCategorie,
} from '../api/reglages'

const emit = defineEmits(['fermer', 'modifie'])

const chorale = ref({ nom: '', ville: '' })
const pupitres = ref([])
const categories = ref([])
const chargement = ref(true)
const erreur = ref('')
const succes = ref('')

const nouveauPupitre = ref('')
const nouvelleCategorie = ref('')
const enEdition = ref(null) // { type: 'pupitre' | 'categorie', id, nom }
const aConfirmer = ref(null) // { type, id }

function messageErreur(e) {
  const erreurs = e.response?.data?.errors
  if (erreurs) return Object.values(erreurs).flat().join(' ')
  if (e.response?.status === 403) return 'Réservé au maître de chœur.'
  return e.response?.data?.message || 'Une erreur est survenue.'
}

async function charger() {
  chargement.value = true
  try {
    const [c, p, cat] = await Promise.all([fetchChorale(), fetchPupitres(), fetchCategories()])
    chorale.value = { nom: c.nom, ville: c.ville || '' }
    pupitres.value = p
    categories.value = cat
  } catch (e) {
    erreur.value = messageErreur(e)
  } finally {
    chargement.value = false
  }
}

/** Recharge et prévient le parent : les listes servent aussi aux filtres et au formulaire de chant. */
async function apresModification(message) {
  erreur.value = ''
  succes.value = message
  await charger()
  emit('modifie')
  setTimeout(() => (succes.value = ''), 3000)
}

async function enregistrerIdentite() {
  erreur.value = ''
  try {
    await renommerChorale(chorale.value)
    await apresModification('Chorale renommée.')
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

// --- Actions génériques sur les deux listes ---

const actions = {
  pupitre: { creer: creerPupitre, renommer: renommerPupitre, supprimer: supprimerPupitre },
  categorie: { creer: creerCategorie, renommer: renommerCategorie, supprimer: supprimerCategorie },
}

async function ajouter(type) {
  const champ = type === 'pupitre' ? nouveauPupitre : nouvelleCategorie
  const nom = champ.value.trim()
  if (!nom) return

  erreur.value = ''
  try {
    await actions[type].creer(nom)
    champ.value = ''
    await apresModification('Ajouté.')
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

function editer(type, element) {
  enEdition.value = { type, id: element.id, nom: element.nom }
  aConfirmer.value = null
}

async function enregistrerEdition() {
  const { type, id, nom } = enEdition.value
  if (!nom.trim()) return

  erreur.value = ''
  try {
    await actions[type].renommer(id, nom.trim())
    enEdition.value = null
    await apresModification('Renommé.')
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

async function retirer(type, id) {
  erreur.value = ''
  aConfirmer.value = null
  try {
    await actions[type].supprimer(id)
    await apresModification('Supprimé.')
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

onMounted(charger)
</script>

<template>
  <div class="fond" @click.self="emit('fermer')">
    <div class="modale">
      <header class="tete">
        <h2>Réglages de la chorale</h2>
        <button class="fermer" @click="emit('fermer')" aria-label="Fermer">×</button>
      </header>

      <p v-if="erreur" class="erreur">{{ erreur }}</p>
      <p v-if="succes" class="succes">{{ succes }}</p>
      <p v-if="chargement" class="aide">Chargement...</p>

      <template v-else>
        <!-- Identité -->
        <p class="section">Identité</p>
        <form class="grille-identite" @submit.prevent="enregistrerIdentite">
          <input v-model="chorale.nom" placeholder="Nom de la chorale" required />
          <input v-model="chorale.ville" placeholder="Ville (facultatif)" />
          <button class="bouton-or" type="submit">Enregistrer</button>
        </form>

        <!-- Pupitres -->
        <p class="section">Pupitres · {{ pupitres.length }}</p>
        <p class="aide">
          Les voix de ta chorale. Un pupitre utilisé par des chants ne peut pas
          être supprimé — renomme-le plutôt.
        </p>

        <ul class="liste">
          <li v-for="p in pupitres" :key="p.id" class="ligne">
            <template v-if="enEdition?.type === 'pupitre' && enEdition.id === p.id">
              <input v-model="enEdition.nom" class="champ-edition" @keyup.enter="enregistrerEdition" />
              <div class="actions">
                <button class="bouton-or" @click="enregistrerEdition">Enregistrer</button>
                <button class="bouton-plat" @click="enEdition = null">Annuler</button>
              </div>
            </template>
            <template v-else>
              <div class="libelle">
                <span class="nom">{{ p.nom }}</span>
                <span class="compteur">
                  {{ p.chants_count }} chant(s) · {{ p.choristes_count }} choriste(s)
                </span>
              </div>
              <div class="actions">
                <button class="bouton-plat" @click="editer('pupitre', p)">Renommer</button>
                <button
                  v-if="!(aConfirmer?.type === 'pupitre' && aConfirmer.id === p.id)"
                  class="bouton-danger"
                  @click="aConfirmer = { type: 'pupitre', id: p.id }"
                >
                  Supprimer
                </button>
                <template v-else>
                  <button class="bouton-danger" @click="retirer('pupitre', p.id)">Confirmer</button>
                  <button class="bouton-plat" @click="aConfirmer = null">Annuler</button>
                </template>
              </div>
            </template>
          </li>
        </ul>

        <form class="ajout" @submit.prevent="ajouter('pupitre')">
          <input v-model="nouveauPupitre" placeholder="Nouveau pupitre (ex : Soliste)" />
          <button class="bouton-or" type="submit">Ajouter</button>
        </form>

        <!-- Catégories -->
        <p class="section">Catégories · {{ categories.length }}</p>
        <p class="aide">
          Temps liturgiques et thématiques utilisés pour classer les chants.
        </p>

        <ul class="liste">
          <li v-for="c in categories" :key="c.id" class="ligne">
            <template v-if="enEdition?.type === 'categorie' && enEdition.id === c.id">
              <input v-model="enEdition.nom" class="champ-edition" @keyup.enter="enregistrerEdition" />
              <div class="actions">
                <button class="bouton-or" @click="enregistrerEdition">Enregistrer</button>
                <button class="bouton-plat" @click="enEdition = null">Annuler</button>
              </div>
            </template>
            <template v-else>
              <div class="libelle">
                <span class="nom">{{ c.nom }}</span>
                <span class="compteur">{{ c.chants_count }} chant(s)</span>
              </div>
              <div class="actions">
                <button class="bouton-plat" @click="editer('categorie', c)">Renommer</button>
                <button
                  v-if="!(aConfirmer?.type === 'categorie' && aConfirmer.id === c.id)"
                  class="bouton-danger"
                  @click="aConfirmer = { type: 'categorie', id: c.id }"
                >
                  Supprimer
                </button>
                <template v-else>
                  <button class="bouton-danger" @click="retirer('categorie', c.id)">Confirmer</button>
                  <button class="bouton-plat" @click="aConfirmer = null">Annuler</button>
                </template>
              </div>
            </template>
          </li>
        </ul>

        <form class="ajout" @submit.prevent="ajouter('categorie')">
          <input v-model="nouvelleCategorie" placeholder="Nouvelle catégorie (ex : Veillée)" />
          <button class="bouton-or" type="submit">Ajouter</button>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.fond {
  position: fixed;
  inset: 0;
  background: rgba(30, 42, 58, 0.55);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
  z-index: 50;
}
.modale {
  background: #fff;
  border: 1px solid #eae2c8;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 620px;
}
.tete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
h2 {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  font-weight: 500;
  color: #1e2a3a;
  margin: 0;
}
.fermer {
  background: none;
  border: none;
  font-size: 26px;
  line-height: 1;
  color: #8a7d5e;
  cursor: pointer;
}
.section {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #b8912f;
  margin: 24px 0 8px;
}
.aide {
  font-size: 12px;
  color: #8a7d5e;
  margin: 0 0 10px;
  line-height: 1.5;
}
.erreur {
  background: #fbeaea;
  border: 1px solid #e4c4c4;
  color: #8b2e2e;
  font-size: 13px;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 12px 0 0;
}
.succes {
  background: #eef4ef;
  border: 1px solid #cfe0d5;
  color: #3e6650;
  font-size: 13px;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 12px 0 0;
}
.grille-identite {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
}
.liste {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ligne {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 9px 0;
  border-top: 1px solid #eae2c8;
}
.libelle {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.nom {
  font-weight: 600;
  font-size: 14px;
  color: #1e2a3a;
}
.compteur {
  font-size: 11px;
  color: #8a7d5e;
}
.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ajout {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.ajout input {
  flex: 1;
  min-width: 0;
}
input {
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #dcd2b4;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  background: #fff;
  min-width: 0;
}
input:focus {
  box-shadow: 0 0 0 2px #b8912f;
}
.champ-edition {
  flex: 1;
  min-width: 160px;
}
.bouton-or {
  background: #b8912f;
  color: #1e2a3a;
  border: none;
  font-weight: 600;
  font-size: 13px;
  padding: 9px 14px;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
}
.bouton-plat {
  background: transparent;
  border: 1px solid #dcd2b4;
  color: #5b5340;
  font-size: 12px;
  padding: 7px 11px;
  border-radius: 8px;
  cursor: pointer;
}
.bouton-danger {
  background: transparent;
  border: 1px solid #e4c4c4;
  color: #8b2e2e;
  font-size: 12px;
  padding: 7px 11px;
  border-radius: 8px;
  cursor: pointer;
}
@media (max-width: 560px) {
  .grille-identite {
    grid-template-columns: 1fr;
  }
}
</style>
