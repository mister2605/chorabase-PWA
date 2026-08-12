<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchChants, fetchChant, createChant, fetchPupitres, fetchCategories } from './api/chants'
import { utilisateurCourant, logout } from './api/auth'
import ChantList from './components/ChantList.vue'
import ChantDetail from './components/ChantDetail.vue'
import ChantForm from './components/ChantForm.vue'
import LoginForm from './components/LoginForm.vue'

const utilisateur = ref(null) // null = pas encore su si connecté ou non
const verificationEnCours = ref(true)
const estMaitreDeChoeur = computed(() => utilisateur.value?.role === 'maitre_choeur')

async function verifierSession() {
  verificationEnCours.value = true
  utilisateur.value = await utilisateurCourant()
  verificationEnCours.value = false
}

function surConnexion(u) {
  utilisateur.value = u
  chargerReferentiels()
  charger()
}

async function seDeconnecter() {
  await logout()
  utilisateur.value = null
}

const chants = ref([])
const chantSelectionne = ref(null)
const query = ref('')
const pupitreFiltre = ref(null)
const showForm = ref(false)
const chargement = ref(false)

// Chargés depuis l'API Laravel (routes /api/pupitres et /api/categories)
const pupitres = ref([])
const categories = ref([])

async function chargerReferentiels() {
  ;[pupitres.value, categories.value] = await Promise.all([fetchPupitres(), fetchCategories()])
}

async function charger() {
  chargement.value = true
  try {
    chants.value = await fetchChants({ q: query.value, pupitreId: pupitreFiltre.value })
    if (!chantSelectionne.value && chants.value.length) {
      selectionner(chants.value[0].id)
    }
  } finally {
    chargement.value = false
  }
}

async function selectionner(id) {
  chantSelectionne.value = await fetchChant(id)
}

const erreurFormulaire = ref('')

async function publier(payload) {
  erreurFormulaire.value = ''
  try {
    await createChant(payload)
    showForm.value = false
    await charger()
  } catch (e) {
    erreurFormulaire.value =
      e.response?.status === 403
        ? "Réservé au maître de chœur — ton compte n'a pas ce rôle."
        : e.response?.status === 401
        ? 'Session expirée, reconnecte-toi.'
        : e.response?.data?.message || "Erreur lors de la publication."
  }
}

let debounceTimer
watch([query, pupitreFiltre], () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(charger, 250)
})

onMounted(async () => {
  await verifierSession()
  if (utilisateur.value) {
    chargerReferentiels()
    charger()
  }
})
</script>

<template>
  <div v-if="verificationEnCours" class="chargement-initial">Chargement...</div>

  <LoginForm v-else-if="!utilisateur" @connecte="surConnexion" />

  <div v-else class="app">
    <header class="entete">
      <div class="entete-interieur">
        <div>
          <p class="souslabel">Chorale NDPS · Ouaga 2000</p>
          <h1 class="titre-app">Chorabase</h1>
        </div>
        <div class="actions-entete">
          <button v-if="estMaitreDeChoeur" class="bouton-ajouter" @click="showForm = true">
            + Ajouter un chant
          </button>
          <button class="bouton-deconnexion" @click="seDeconnecter">Déconnexion</button>
        </div>
      </div>
    </header>

    <main class="contenu">
      <ChantList
        :chants="chants"
        :selected-id="chantSelectionne?.id ?? null"
        :query="query"
        :pupitres="pupitres"
        :pupitre-filtre="pupitreFiltre"
        @update:query="query = $event"
        @select="selectionner"
        @filtrer-pupitre="pupitreFiltre = $event"
      />
      <ChantDetail :chant="chantSelectionne" />
    </main>

    <ChantForm
      v-if="showForm"
      :categories="categories"
      :pupitres="pupitres"
      :erreur-externe="erreurFormulaire"
      @fermer="showForm = false; erreurFormulaire = ''"
      @publier="publier"
    />
  </div>
</template>

<style scoped>
.chargement-initial {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a7d5e;
  font-size: 14px;
}
.app {
  min-height: 100vh;
}
.entete {
  background: #1e2a3a;
  padding: 20px 20px;
}
.entete-interieur {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.actions-entete {
  display: flex;
  align-items: center;
  gap: 10px;
}
.souslabel {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #b8912f;
  margin: 0 0 4px;
}
.titre-app {
  font-family: 'Fraunces', serif;
  font-size: 26px;
  font-weight: 500;
  color: #f6f1e4;
  margin: 0;
}
.bouton-ajouter {
  background: #b8912f;
  color: #1e2a3a;
  border: none;
  font-weight: 600;
  font-size: 14px;
  padding: 9px 16px;
  border-radius: 999px;
  cursor: pointer;
}
.bouton-deconnexion {
  background: transparent;
  color: #cfc6ab;
  border: 1px solid #3a4657;
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
}
.contenu {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 20px;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
}
@media (max-width: 720px) {
  .contenu {
    grid-template-columns: 1fr;
  }
}
</style>
