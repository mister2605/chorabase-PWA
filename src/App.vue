<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  fetchChants,
  fetchChant,
  createChant,
  fetchPupitres,
  fetchCategories,
  restaurerVersion,
} from './api/chants'
import { utilisateurCourant, logout } from './api/auth'
import ChantList from './components/ChantList.vue'
import ChantDetail from './components/ChantDetail.vue'
import ChantForm from './components/ChantForm.vue'
import LoginForm from './components/LoginForm.vue'
import MembresAdmin from './components/MembresAdmin.vue'
import HistoriqueVersions from './components/HistoriqueVersions.vue'
import DefinirMotDePasse from './components/DefinirMotDePasse.vue'
import Adhesion from './components/Adhesion.vue'
import ReglagesChorale from './components/ReglagesChorale.vue'
import InstallationIos from './components/InstallationIos.vue'
import Programme from './components/Programme.vue'

// --- Lien d'invitation ---
// Pas de vue-router dans ce projet : on lit directement l'URL. Un lien
// d'invitation ressemble à  /?invitation=<jeton>&email=<email>
const parametres = new URLSearchParams(window.location.search)
const invitation = ref(
  parametres.get('invitation') ? { token: parametres.get('invitation'), email: parametres.get('email') || '' } : null
)
// Lien d'adhesion global : /?adhesion=<code>
const codeAdhesion = ref(parametres.get('adhesion'))
const messageAccueil = ref('')

/** Efface le jeton de la barre d'adresse : il ne doit pas rester dans l'historique. */
function nettoyerUrl() {
  window.history.replaceState({}, '', window.location.pathname)
}

function terminerInvitation() {
  invitation.value = null
  nettoyerUrl()
}

function lienAdhesionInvalide() {
  codeAdhesion.value = null
  messageAccueil.value = "Ce lien d'adhesion n'est plus valable. Demande le lien à jour au maître de chœur."
  nettoyerUrl()
}

async function surAdhesion(u) {
  codeAdhesion.value = null
  nettoyerUrl()
  surConnexion(u)
}

const utilisateur = ref(null) // null = pas encore su si connecté ou non
const verificationEnCours = ref(true)
const estMaitreDeChoeur = computed(() => utilisateur.value?.role === 'maitre_choeur')

/**
 * Mode hors ligne.
 *
 * L'appli continue de fonctionner sans réseau : chants déjà consultés et
 * audios déjà écoutés restent disponibles. Mais il faut le DIRE, sinon la
 * personne croit que l'appli est cassée — et surtout, elle ne comprend pas
 * pourquoi le bouton "Ajouter un chant" échoue.
 *
 * navigator.onLine est approximatif (il dit "en ligne" sur un wifi sans
 * internet), donc on ne s'en sert que pour informer, jamais pour bloquer.
 */
const horsLigne = ref(typeof navigator !== 'undefined' && navigator.onLine === false)

function surRetourReseau() {
  horsLigne.value = false
}
function surPerteReseau() {
  horsLigne.value = true
}

const pupitreUtilisateur = computed(() => utilisateur.value?.pupitre?.id ?? null)

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
const showMembres = ref(false)
const showReglages = ref(false)
const showHistorique = ref(false)
const showProgramme = ref(false)
const chargement = ref(false)

// Chargés depuis l'API Laravel (routes /api/pupitres et /api/categories)
const pupitres = ref([])
const categories = ref([])

async function chargerReferentiels() {
  ;[pupitres.value, categories.value] = await Promise.all([fetchPupitres(), fetchCategories()])
}

async function charger() {
  chargement.value = true
  erreurGlobale.value = ''
  try {
    chants.value = await fetchChants({ q: query.value, pupitreId: pupitreFiltre.value })
    if (!chantSelectionne.value && chants.value.length) {
      selectionner(chants.value[0].id)
    }
  } catch (e) {
    // Sans ce catch, un refus du serveur se traduisait par une liste vide et
    // le message "Aucun chant ne correspond" — indiscernable d'un repertoire
    // reellement vide. Un echec doit se voir.
    erreurGlobale.value = messageErreur(e, 'Impossible de charger les chants.')
  } finally {
    chargement.value = false
  }
}

async function selectionner(id) {
  chantSelectionne.value = await fetchChant(id)
}

/**
 * Depuis le programme, on ouvre un chant : on ferme la fenêtre pour laisser
 * voir les paroles et l'audio. Le choriste qui lit le programme veut le
 * chant, pas garder deux écrans superposés.
 */
async function ouvrirChantDepuisProgramme(chantId) {
  showProgramme.value = false
  try {
    await selectionner(chantId)
  } catch (e) {
    erreurGlobale.value = messageErreur(e, "Ce chant n'a pas pu être ouvert.")
  }
}

const erreurFormulaire = ref('')

/**
 * Laravel renvoie le detail champ par champ dans `errors`. On l'affiche tel
 * quel : "Le fichier depasse la limite de PHP" est infiniment plus utile
 * qu'un "Erreur lors de la publication" generique.
 */
/**
 * La session n'est plus valide cote serveur : on remet l'appli dans un etat
 * coherent au lieu de laisser une interface complete qui ne repond plus.
 *
 * Sans ca, on voyait les boutons "Membres", "Reglages", "Ajouter un chant"
 * et une liste vide — indiscernable d'un repertoire vide, alors que le
 * serveur refusait simplement chaque requete.
 */
function sessionPerdue() {
  utilisateur.value = null
  chants.value = []
  chantSelectionne.value = null
  showForm.value = false
  showMembres.value = false
  showReglages.value = false
  showHistorique.value = false
  showProgramme.value = false
  erreurGlobale.value = ''
  messageAccueil.value = 'Ta session a expiré. Reconnecte-toi pour retrouver le répertoire.'
}

function messageErreur(e, defaut) {
  // Aucune reponse : le serveur n'a pas ete joint du tout.
  if (! e.response) {
    return 'Le serveur ne répond pas. Les chants déjà consultés restent lisibles hors ligne.'
  }
  if (e.response?.status === 403) return "Réservé au maître de chœur — ton compte n'a pas ce rôle."
  if (e.response?.status === 401) {
    sessionPerdue()
    return '' // l'ecran de connexion prend le relais, un bandeau en plus n'aiderait pas
  }
  if (e.response?.status === 413) {
    return 'Le formulaire est trop lourd pour le serveur : augmente post_max_size dans le php.ini, '
      + 'ou envoie moins de fichiers audio à la fois.'
  }
  const erreurs = e.response?.data?.errors
  if (erreurs) return Object.values(erreurs).flat().join(' ')
  return e.response?.data?.message || defaut
}

async function publier(payload) {
  erreurFormulaire.value = ''
  try {
    await createChant(payload)
    showForm.value = false
    await charger()
  } catch (e) {
    erreurFormulaire.value = messageErreur(e, 'Erreur lors de la publication.')
  }
}

/**
 * Apres un changement de reglages : on recharge pupitres et categories
 * (ils alimentent les filtres et le formulaire de chant) et l'utilisateur
 * (l'entete affiche le nom de la chorale, qui vient peut-etre de changer).
 */
async function surReglagesModifies() {
  // On ne passe PAS par verifierSession() : elle leve le drapeau de chargement
  // global et ferait clignoter toute l'appli sur "Chargement...".
  const [, u] = await Promise.all([chargerReferentiels(), utilisateurCourant()])
  if (u) utilisateur.value = u
}

const erreurGlobale = ref('')
const erreurHistorique = ref('')

async function restaurer(version) {
  erreurHistorique.value = ''
  try {
    chantSelectionne.value = await restaurerVersion(chantSelectionne.value.id, version.id)
    await charger()
  } catch (e) {
    erreurHistorique.value = messageErreur(e, 'Impossible de restaurer cette version.')
  }
}

let debounceTimer
watch([query, pupitreFiltre], () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(charger, 250)
})

onMounted(async () => {
  window.addEventListener('online', surRetourReseau)
  window.addEventListener('offline', surPerteReseau)

  if (invitation.value || codeAdhesion.value) {
    verificationEnCours.value = false
    return // on n'interroge pas /api/user tant que le lien n'est pas traité
  }
  await verifierSession()
  if (utilisateur.value) {
    chargerReferentiels()
    charger()
  }
})

onUnmounted(() => {
  window.removeEventListener('online', surRetourReseau)
  window.removeEventListener('offline', surPerteReseau)
})
</script>

<template>
  <InstallationIos />

  <Adhesion
    v-if="codeAdhesion"
    :code="codeAdhesion"
    @inscrit="surAdhesion"
    @lien-invalide="lienAdhesionInvalide"
  />

  <DefinirMotDePasse
    v-else-if="invitation"
    :token="invitation.token"
    :email="invitation.email"
    @termine="terminerInvitation"
  />

  <div v-else-if="verificationEnCours" class="chargement-initial">Chargement...</div>

  <template v-else-if="!utilisateur">
    <p v-if="messageAccueil" class="bandeau-accueil">{{ messageAccueil }}</p>
    <LoginForm @connecte="surConnexion" />
  </template>

  <div v-else class="app">
    <header class="entete">
      <div class="entete-interieur">
        <div>
          <p class="souslabel">
            {{ utilisateur.chorale?.nom || 'Répertoire' }}<span v-if="utilisateur.chorale?.ville"> · {{ utilisateur.chorale.ville }}</span>
          </p>
          <h1 class="titre-app">Chorabase</h1>
        </div>
        <div class="actions-entete">
          <!-- Le programme s'adresse à TOUTE la chorale : c'est la raison
               d'ouvrir l'appli le samedi soir. Il vient donc avant les
               boutons d'administration, et pour tout le monde. -->
          <button class="bouton-programme" @click="showProgramme = true">
            Programme
          </button>
          <button v-if="estMaitreDeChoeur" class="bouton-ajouter" @click="showForm = true">
            + Ajouter un chant
          </button>
          <button v-if="estMaitreDeChoeur" class="bouton-secondaire" @click="showMembres = true">
            Membres
          </button>
          <button v-if="estMaitreDeChoeur" class="bouton-secondaire" @click="showReglages = true">
            Réglages
          </button>
          <button class="bouton-deconnexion" @click="seDeconnecter">Déconnexion</button>
        </div>
      </div>
    </header>

    <p v-if="horsLigne" class="bandeau-hors-ligne">
      Hors ligne — tu consultes les chants déjà ouverts. Les modifications
      attendront le retour du réseau.
    </p>

    <p v-if="erreurGlobale" class="bandeau-erreur">{{ erreurGlobale }}</p>

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
      <ChantDetail
        :chant="chantSelectionne"
        :pupitre-utilisateur="pupitreUtilisateur"
        @voir-historique="showHistorique = true"
      />
    </main>

    <ChantForm
      v-if="showForm"
      :categories="categories"
      :pupitres="pupitres"
      :erreur-externe="erreurFormulaire"
      @fermer="showForm = false; erreurFormulaire = ''"
      @publier="publier"
    />

    <MembresAdmin
      v-if="showMembres"
      :pupitres="pupitres"
      :utilisateur-id="utilisateur.id"
      @fermer="showMembres = false"
    />

    <ReglagesChorale
      v-if="showReglages"
      @fermer="showReglages = false"
      @modifie="surReglagesModifies"
    />

    <Programme
      v-if="showProgramme"
      :utilisateur="utilisateur"
      :chants="chants"
      @fermer="showProgramme = false"
      @ouvrir-chant="ouvrirChantDepuisProgramme"
    />

    <HistoriqueVersions
      v-if="showHistorique && chantSelectionne"
      :chant="chantSelectionne"
      :peut-restaurer="estMaitreDeChoeur"
      @fermer="showHistorique = false; erreurHistorique = ''"
      @restaurer="restaurer"
    />

    <p v-if="erreurHistorique" class="toast-erreur">{{ erreurHistorique }}</p>
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
  flex-wrap: wrap;
  justify-content: flex-end;
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
.bouton-programme {
  background: #f6f1e4;
  color: #1e2a3a;
  border: none;
  font-family: inherit;
  font-weight: 600;
  font-size: 14px;
  padding: 9px 16px;
  border-radius: 999px;
  cursor: pointer;
}
.bouton-secondaire {
  background: transparent;
  color: #f6f1e4;
  border: 1px solid #b8912f;
  font-size: 13px;
  padding: 8px 14px;
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
.bandeau-accueil {
  background: #fbeaea;
  border-bottom: 1px solid #e4c4c4;
  color: #8b2e2e;
  font-size: 13px;
  text-align: center;
  padding: 10px 16px;
  margin: 0;
}
.bandeau-hors-ligne {
  max-width: 960px;
  margin: 16px auto 0;
  background: #f6f1e4;
  border: 1px solid #eae2c8;
  color: #5b5340;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 8px;
  padding: 10px 14px;
}
.bandeau-erreur {
  max-width: 960px;
  margin: 16px auto 0;
  background: #fbeaea;
  border: 1px solid #e4c4c4;
  color: #8b2e2e;
  font-size: 13px;
  border-radius: 8px;
  padding: 10px 14px;
}
.toast-erreur {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  background: #8b2e2e;
  color: #fff;
  font-size: 13px;
  padding: 10px 16px;
  border-radius: 999px;
  z-index: 60;
  margin: 0;
}
@media (max-width: 720px) {
  .contenu {
    grid-template-columns: 1fr;
  }
}
</style>
