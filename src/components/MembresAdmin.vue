<script setup>
import { ref, onMounted } from 'vue'
import {
  fetchMembres,
  creerMembre,
  regenererInvitation,
  modifierMembre,
  supprimerMembre,
  fetchChorale,
  basculerAdhesion,
  regenererAdhesion,
} from '../api/membres'

defineProps({
  pupitres: { type: Array, default: () => [] },
  utilisateurId: { type: Number, required: true },
})
defineEmits(['fermer'])

const membres = ref([])
const chorale = ref(null)
const chargement = ref(true)
const erreur = ref('')

// Le lien nominatif fraîchement généré, affiché en grand pour être transmis
const lienActif = ref(null) // { nom, lien }
const copie = ref('')       // identifiant de ce qui vient d'être copié

const nouveau = ref({ name: '', email: '', role: 'choriste', pupitre_id: null })
const envoiEnCours = ref(false)
const confirmerRegeneration = ref(false)

function messageErreur(e) {
  const erreurs = e.response?.data?.errors
  if (erreurs) return Object.values(erreurs).flat().join(' ')
  return e.response?.data?.message || 'Une erreur est survenue.'
}

async function charger() {
  chargement.value = true
  try {
    ;[membres.value, chorale.value] = await Promise.all([fetchMembres(), fetchChorale()])
  } catch (e) {
    erreur.value = messageErreur(e)
  } finally {
    chargement.value = false
  }
}

// --- Lien d'adhésion (un seul lien pour toute la chorale) ---

async function basculer() {
  erreur.value = ''
  try {
    chorale.value = await basculerAdhesion(!chorale.value.adhesion_ouverte)
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

async function regenerer() {
  erreur.value = ''
  confirmerRegeneration.value = false
  try {
    chorale.value = await regenererAdhesion()
    copie.value = ''
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

function messageAdhesion() {
  return (
    `Bonjour, voici le lien pour rejoindre le répertoire de la chorale sur Chorabase. ` +
    `Chacun crée son compte lui-même : ${chorale.value.lien_adhesion}`
  )
}

// --- Comptes nominatifs (pour quelqu'un qui n'a pas le lien global) ---

async function ajouter() {
  erreur.value = ''
  envoiEnCours.value = true
  try {
    const { membre, lien_invitation } = await creerMembre({
      ...nouveau.value,
      pupitre_id: nouveau.value.pupitre_id || null,
    })
    lienActif.value = { nom: membre.name, lien: lien_invitation }
    copie.value = ''
    nouveau.value = { name: '', email: '', role: 'choriste', pupitre_id: null }
    await charger()
  } catch (e) {
    erreur.value = messageErreur(e)
  } finally {
    envoiEnCours.value = false
  }
}

async function nouveauLien(membre) {
  erreur.value = ''
  try {
    lienActif.value = { nom: membre.name, lien: await regenererInvitation(membre.id) }
    copie.value = ''
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

async function changerRole(membre, role) {
  erreur.value = ''
  try {
    await modifierMembre(membre.id, { role })
    await charger()
  } catch (e) {
    erreur.value = messageErreur(e)
    await charger() // on remet la liste dans son vrai état
  }
}

async function retirer(membre) {
  erreur.value = ''
  try {
    await supprimerMembre(membre.id)
    await charger()
  } catch (e) {
    erreur.value = messageErreur(e)
  }
}

function texteWhatsApp(nom, lien) {
  return (
    `Bonjour ${nom}, ton compte Chorabase est prêt. ` +
    `Ouvre ce lien pour choisir ton mot de passe (valable 7 jours) : ${lien}`
  )
}

async function copier(texte, marqueur) {
  try {
    await navigator.clipboard.writeText(texte)
    copie.value = marqueur
  } catch {
    copie.value = '' // le navigateur a refusé : le champ reste sélectionnable à la main
  }
}

onMounted(charger)
</script>

<template>
  <div class="fond" @click.self="$emit('fermer')">
    <div class="modale">
      <header class="tete">
        <h2>Membres de la chorale</h2>
        <button class="fermer" @click="$emit('fermer')" aria-label="Fermer">×</button>
      </header>

      <p v-if="erreur" class="erreur">{{ erreur }}</p>

      <!-- ============ Lien d'adhésion : un seul lien pour tout le monde ============ -->
      <p class="section">Lien d'adhésion de la chorale</p>

      <div v-if="chorale" class="bloc-adhesion" :class="{ ferme: !chorale.adhesion_ouverte }">
        <div class="ligne-bascule">
          <div>
            <p class="etat">
              {{ chorale.adhesion_ouverte ? 'Adhésion ouverte' : 'Adhésion fermée' }}
            </p>
            <p class="aide">
              {{
                chorale.adhesion_ouverte
                  ? 'Toute personne qui a le lien peut créer son compte choriste.'
                  : 'Le lien ne fonctionne pas. Ouvre l’adhésion le temps des inscriptions.'
              }}
            </p>
          </div>
          <button class="bouton-or" @click="basculer">
            {{ chorale.adhesion_ouverte ? 'Fermer' : 'Ouvrir' }}
          </button>
        </div>

        <template v-if="chorale.adhesion_ouverte">
          <textarea class="champ-lien" rows="3" readonly :value="messageAdhesion()"></textarea>
          <div class="actions-lien">
            <button class="bouton-or" @click="copier(messageAdhesion(), 'adhesion-message')">
              {{ copie === 'adhesion-message' ? 'Copié ✓' : 'Copier le message' }}
            </button>
            <button class="bouton-plat" @click="copier(chorale.lien_adhesion, 'adhesion-lien')">
              {{ copie === 'adhesion-lien' ? 'Copié ✓' : 'Copier le lien seul' }}
            </button>
            <button v-if="!confirmerRegeneration" class="bouton-plat" @click="confirmerRegeneration = true">
              Nouveau lien
            </button>
            <template v-else>
              <button class="bouton-danger" @click="regenerer">Confirmer : invalider l'ancien</button>
              <button class="bouton-plat" @click="confirmerRegeneration = false">Annuler</button>
            </template>
          </div>
          <p v-if="confirmerRegeneration" class="aide">
            L'ancien lien cessera immédiatement de fonctionner. À faire si le lien
            est sorti du groupe de la chorale.
          </p>
        </template>
      </div>

      <!-- ============ Lien d'invitation nominatif ============ -->
      <div v-if="lienActif" class="bloc-lien">
        <p class="titre-lien">Lien d'invitation pour {{ lienActif.nom }}</p>
        <p class="aide">
          Valable 7 jours, utilisable une seule fois. Le choriste choisira
          lui-même son mot de passe.
        </p>
        <textarea class="champ-lien" rows="3" readonly :value="texteWhatsApp(lienActif.nom, lienActif.lien)"></textarea>
        <div class="actions-lien">
          <button class="bouton-or" @click="copier(texteWhatsApp(lienActif.nom, lienActif.lien), 'invit-message')">
            {{ copie === 'invit-message' ? 'Copié ✓' : 'Copier le message' }}
          </button>
          <button class="bouton-plat" @click="copier(lienActif.lien, 'invit-lien')">
            {{ copie === 'invit-lien' ? 'Copié ✓' : 'Copier le lien seul' }}
          </button>
          <button class="bouton-plat" @click="lienActif = null">Masquer</button>
        </div>
      </div>

      <!-- ============ Créer un compte à la main ============ -->
      <form class="formulaire" @submit.prevent="ajouter">
        <p class="section">Ajouter un membre à la main</p>
        <p class="aide">
          Utile pour nommer un maître de chœur, ou pour quelqu'un qui n'est pas
          dans le groupe WhatsApp.
        </p>
        <div class="grille">
          <input v-model="nouveau.name" placeholder="Nom complet" required />
          <input v-model="nouveau.email" type="email" placeholder="Email" required />
          <select v-model="nouveau.pupitre_id">
            <option :value="null">Pupitre —</option>
            <option v-for="p in pupitres" :key="p.id" :value="p.id">{{ p.nom }}</option>
          </select>
          <select v-model="nouveau.role">
            <option value="choriste">Choriste</option>
            <option value="maitre_choeur">Maître de chœur</option>
          </select>
        </div>
        <button class="bouton-or" type="submit" :disabled="envoiEnCours">
          {{ envoiEnCours ? 'Création...' : 'Créer le compte et générer le lien' }}
        </button>
      </form>

      <!-- ============ Liste ============ -->
      <p class="section">{{ membres.length }} membre(s)</p>
      <p v-if="chargement" class="aide">Chargement...</p>
      <ul v-else class="liste">
        <li v-for="m in membres" :key="m.id" class="ligne">
          <div class="identite">
            <span class="nom">{{ m.name }}</span>
            <span class="email">{{ m.email }}</span>
            <span class="tags">
              <span v-if="m.pupitre" class="tag">{{ m.pupitre.nom }}</span>
              <span v-if="!m.active_le" class="tag attente" title="Le compte est inutilisable tant que la personne n'a pas ouvert son lien d'invitation">
                En attente d'activation
              </span>
            </span>
          </div>
          <div class="controles">
            <select
              :value="m.role"
              :disabled="m.id === utilisateurId"
              @change="changerRole(m, $event.target.value)"
            >
              <option value="choriste">Choriste</option>
              <option value="maitre_choeur">Maître de chœur</option>
            </select>
            <button class="bouton-plat" @click="nouveauLien(m)">Nouveau lien</button>
            <button
              class="bouton-danger"
              :disabled="m.id === utilisateurId"
              :title="m.id === utilisateurId ? 'Tu ne peux pas supprimer ton propre compte' : ''"
              @click="retirer(m)"
            >
              Supprimer
            </button>
          </div>
        </li>
      </ul>
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
  max-width: 680px;
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
  margin: 22px 0 8px;
}
.aide {
  font-size: 12px;
  color: #8a7d5e;
  margin: 0 0 10px;
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
.bloc-adhesion {
  background: #f1f5f2;
  border: 1px solid #cfe0d5;
  border-radius: 10px;
  padding: 14px;
}
.bloc-adhesion.ferme {
  background: #faf8f2;
  border-color: #eae2c8;
}
.ligne-bascule {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.etat {
  font-weight: 600;
  font-size: 14px;
  color: #1e2a3a;
  margin: 0 0 2px;
}
.bloc-lien {
  background: #f6f1e4;
  border: 1px solid #eae2c8;
  border-radius: 10px;
  padding: 14px;
  margin-top: 16px;
}
.titre-lien {
  font-weight: 600;
  font-size: 14px;
  color: #1e2a3a;
  margin: 0 0 4px;
}
.champ-lien {
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid #dcd2b4;
  border-radius: 8px;
  padding: 8px 10px;
  resize: vertical;
  background: #fff;
  margin-top: 10px;
}
.actions-lien {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.formulaire {
  margin-top: 4px;
}
.grille {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}
input,
select {
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #dcd2b4;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  background: #fff;
  min-width: 0;
}
input:focus,
select:focus {
  box-shadow: 0 0 0 2px #b8912f;
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
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 0;
  border-top: 1px solid #eae2c8;
}
.identite {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.nom {
  font-weight: 600;
  font-size: 14px;
  color: #1e2a3a;
}
.email {
  font-size: 12px;
  color: #8a7d5e;
  word-break: break-all;
}
.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}
.tag.attente {
  background: #fdf3e3;
  border-color: #e8d3a8;
  color: #8a6d1f;
}
.tag {
  font-size: 11px;
  align-self: flex-start;
  padding: 1px 8px;
  border-radius: 999px;
  background: #f6f1e4;
  border: 1px solid #eae2c8;
  color: #5b5340;
}
.controles {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
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
.bouton-or:disabled {
  opacity: 0.6;
  cursor: default;
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
.bouton-danger:disabled {
  opacity: 0.45;
  cursor: default;
}
@media (max-width: 560px) {
  .grille {
    grid-template-columns: 1fr;
  }
}
</style>
