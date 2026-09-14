<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchCelebrations, supprimerCelebration, annoterItem } from '../api/celebrations'
import CelebrationForm from './CelebrationForm.vue'

const props = defineProps({
  utilisateur: { type: Object, required: true },
  chants: { type: Array, default: () => [] },
})
const emit = defineEmits(['fermer', 'ouvrir-chant'])

const estMaitreDeChoeur = computed(() => props.utilisateur.role === 'maitre_choeur')
const estInstrumentiste = computed(() => props.utilisateur.role === 'instrumentiste')
const peutAnnoter = computed(() => estMaitreDeChoeur.value || estInstrumentiste.value)

const celebrations = ref([])
const historique = ref(false)
const chargement = ref(true)
const erreur = ref('')

const ouverte = ref(null) // id de la célébration dépliée
const enEdition = ref(null) // null | 'nouvelle' | objet célébration
const aSupprimer = ref(null)

const LIBELLES = {
  messe: 'Messe',
  repetition: 'Répétition',
  mariage: 'Mariage',
  funerailles: 'Funérailles',
  concert: 'Concert',
  autre: 'Célébration',
}

function messageErreur(e, defaut) {
  if (!e.response) return 'Le serveur ne répond pas. Le dernier programme consulté reste lisible.'
  if (e.response.status === 403) return "Ton compte n'a pas ce droit."
  const erreurs = e.response.data?.errors
  if (erreurs) return Object.values(erreurs).flat().join(' ')
  return e.response.data?.message || defaut
}

async function charger() {
  chargement.value = true
  erreur.value = ''
  try {
    celebrations.value = await fetchCelebrations({ passees: historique.value })
  } catch (e) {
    erreur.value = messageErreur(e, 'Impossible de charger le programme.')
  } finally {
    chargement.value = false
  }
}

function basculerHistorique() {
  historique.value = !historique.value
  ouverte.value = null
  charger()
}

function basculer(id) {
  ouverte.value = ouverte.value === id ? null : id
}

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatHeure(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

async function confirmerSuppression() {
  const cible = aSupprimer.value
  aSupprimer.value = null
  try {
    await supprimerCelebration(cible.id)
    await charger()
  } catch (e) {
    erreur.value = messageErreur(e, 'Impossible de supprimer.')
  }
}

function apresEnregistrement() {
  enEdition.value = null
  charger()
}

// --- Note des instrumentistes ---

const noteEnEdition = ref(null) // { celebrationId, itemId, texte }
const noteEnCours = ref(false)

function editerNote(celebration, item) {
  noteEnEdition.value = {
    celebrationId: celebration.id,
    itemId: item.id,
    texte: item.note_instrument || '',
  }
}

async function enregistrerNote() {
  const n = noteEnEdition.value
  noteEnCours.value = true
  try {
    const itemAJour = await annoterItem(n.celebrationId, n.itemId, n.texte.trim() || null)
    // Mise à jour sur place : recharger toute la liste ferait sauter le
    // dépliage et perdrait la position de lecture.
    const c = celebrations.value.find((x) => x.id === n.celebrationId)
    const i = c?.items?.find((x) => x.id === n.itemId)
    if (i) i.note_instrument = itemAJour.note_instrument
    noteEnEdition.value = null
  } catch (e) {
    erreur.value = messageErreur(e, "Impossible d'enregistrer la note.")
  } finally {
    noteEnCours.value = false
  }
}

onMounted(charger)
</script>

<template>
  <div class="fond" @click.self="emit('fermer')">
    <div class="modale">
      <div class="tete">
        <h2>{{ historique ? 'Célébrations passées' : 'Programme' }}</h2>
        <button class="fermer" @click="emit('fermer')" aria-label="Fermer">×</button>
      </div>

      <div class="barre">
        <button class="lien" @click="basculerHistorique">
          {{ historique ? '← Revenir aux prochaines' : 'Voir les célébrations passées' }}
        </button>
        <button v-if="estMaitreDeChoeur && !historique" class="principal" @click="enEdition = 'nouvelle'">
          + Nouveau programme
        </button>
      </div>

      <p v-if="erreur" class="erreur">{{ erreur }}</p>
      <p v-if="chargement" class="aide">Chargement...</p>

      <p v-else-if="!celebrations.length" class="vide">
        <template v-if="historique">Aucune célébration passée.</template>
        <template v-else-if="estMaitreDeChoeur">
          Rien de prévu pour l'instant. Crée le programme de la prochaine messe :
          les choristes le verront dès que tu le publieras.
        </template>
        <template v-else>
          Aucun programme publié pour l'instant. Le maître de chœur le mettra
          en ligne avant la prochaine célébration.
        </template>
      </p>

      <div v-for="c in celebrations" :key="c.id" class="celebration">
        <button class="entete-celebration" @click="basculer(c.id)">
          <div class="infos">
            <p class="date">
              {{ formatDate(c.debut_le) }} · {{ formatHeure(c.debut_le) }}
              <span v-if="!c.est_publiee" class="brouillon">brouillon</span>
            </p>
            <p class="intitule">{{ c.titre || LIBELLES[c.type] || 'Célébration' }}</p>
            <p v-if="c.lieu" class="lieu">{{ c.lieu }}</p>
          </div>
          <span class="chevron">{{ ouverte === c.id ? '−' : '+' }}</span>
        </button>

        <div v-if="ouverte === c.id" class="detail">
          <p v-if="c.notes" class="mot">{{ c.notes }}</p>

          <p v-if="!c.items?.length" class="aide">Aucun chant n'a encore été ajouté.</p>

          <div v-for="item in c.items" :key="item.id" class="item">
            <p class="moment">{{ item.moment }}</p>
            <p class="chant">
              {{ item.intitule }}
              <span v-if="item.chant?.tonalite" class="ton">· {{ item.chant.tonalite }}</span>
            </p>
            <p v-if="item.notes" class="consigne">{{ item.notes }}</p>

            <p v-if="item.note_instrument" class="note-instrument">
              <span class="etiquette">Instruments</span> {{ item.note_instrument }}
            </p>

            <div class="actions-item">
              <button
                v-if="item.chant_id"
                class="lien"
                @click="emit('ouvrir-chant', item.chant_id)"
              >
                Ouvrir le chant
              </button>
              <button v-if="peutAnnoter" class="lien" @click="editerNote(c, item)">
                {{ item.note_instrument ? 'Modifier la note instruments' : '+ Note instruments' }}
              </button>
            </div>

            <div v-if="noteEnEdition && noteEnEdition.itemId === item.id" class="edition-note">
              <textarea
                v-model="noteEnEdition.texte"
                rows="2"
                placeholder="Tonalité jouée, intro, tempo..."
              ></textarea>
              <div class="boutons-note">
                <button class="secondaire" @click="noteEnEdition = null">Annuler</button>
                <button class="principal" :disabled="noteEnCours" @click="enregistrerNote">
                  {{ noteEnCours ? '...' : 'Enregistrer' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="estMaitreDeChoeur" class="actions-celebration">
            <button class="secondaire" @click="enEdition = c">Modifier</button>
            <button class="danger" @click="aSupprimer = c">Supprimer</button>
          </div>
        </div>
      </div>

      <p v-if="estInstrumentiste" class="mention">
        Tu peux ajouter ta note sur chaque chant — tonalité jouée, intro, tempo.
        Le maître de chœur la voit, et elle est conservée même quand il modifie
        le programme.
      </p>
    </div>

    <CelebrationForm
      v-if="enEdition"
      :celebration="enEdition === 'nouvelle' ? null : enEdition"
      :chants="chants"
      @fermer="enEdition = null"
      @enregistre="apresEnregistrement"
    />

    <div v-if="aSupprimer" class="fond confirmation" @click.self="aSupprimer = null">
      <div class="boite">
        <p class="question">
          Supprimer le programme du {{ formatDate(aSupprimer.debut_le) }} ?
        </p>
        <p class="aide">Les chants du répertoire ne sont pas touchés, seul le programme disparaît.</p>
        <div class="boutons-note">
          <button class="secondaire" @click="aSupprimer = null">Annuler</button>
          <button class="danger" @click="confirmerSuppression">Supprimer</button>
        </div>
      </div>
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
.confirmation {
  z-index: 60;
  align-items: center;
}
.modale {
  background: #fff;
  border: 1px solid #eae2c8;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 620px;
  height: fit-content;
}
.boite {
  background: #fff;
  border-radius: 12px;
  padding: 22px;
  width: 100%;
  max-width: 380px;
}
.tete {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
.barre {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin: 14px 0 16px;
}
.aide {
  font-size: 12px;
  color: #8a7d5e;
  margin: 0 0 8px;
  line-height: 1.5;
}
.vide {
  font-size: 13px;
  color: #5b5340;
  line-height: 1.6;
  background: #f6f1e4;
  border-radius: 8px;
  padding: 14px;
  margin: 0;
}
.erreur {
  background: #fbeaea;
  border: 1px solid #e4c4c4;
  color: #8b2e2e;
  font-size: 13px;
  border-radius: 8px;
  padding: 9px 12px;
  margin: 0 0 12px;
}
.celebration {
  border: 1px solid #eae2c8;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
}
.entete-celebration {
  width: 100%;
  background: #fdfbf5;
  border: none;
  font-family: inherit;
  text-align: left;
  padding: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.infos {
  min-width: 0;
}
.date {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #b8912f;
  margin: 0 0 4px;
}
.brouillon {
  background: #eae2c8;
  color: #5b5340;
  border-radius: 999px;
  padding: 1px 7px;
  margin-left: 6px;
  letter-spacing: 0.04em;
}
.intitule {
  font-family: 'Fraunces', serif;
  font-size: 17px;
  color: #1e2a3a;
  margin: 0;
}
.lieu {
  font-size: 12px;
  color: #8a7d5e;
  margin: 3px 0 0;
}
.chevron {
  color: #8a7d5e;
  font-size: 18px;
  flex-shrink: 0;
}
.detail {
  padding: 4px 14px 14px;
  border-top: 1px solid #eae2c8;
}
.mot {
  font-size: 13px;
  color: #5b5340;
  line-height: 1.6;
  background: #f6f1e4;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 12px 0;
}
.item {
  padding: 10px 0;
  border-bottom: 1px solid #f2ecda;
}
.item:last-of-type {
  border-bottom: none;
}
.moment {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #8a7d5e;
  margin: 0 0 2px;
}
.chant {
  font-size: 15px;
  color: #1e2a3a;
  margin: 0;
}
.ton {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #8a7d5e;
}
.consigne {
  font-size: 12px;
  color: #5b5340;
  margin: 4px 0 0;
  line-height: 1.5;
}
.note-instrument {
  font-size: 12px;
  color: #5b5340;
  line-height: 1.5;
  margin: 6px 0 0;
  background: #f0f4f8;
  border-radius: 6px;
  padding: 7px 9px;
}
.etiquette {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #2e5c8b;
  margin-right: 5px;
}
.actions-item {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.lien {
  background: none;
  border: none;
  color: #8a7d5e;
  font-family: inherit;
  font-size: 12px;
  text-decoration: underline;
  text-underline-offset: 3px;
  padding: 0;
  cursor: pointer;
}
.edition-note {
  margin-top: 8px;
}
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #dcd2b4;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
textarea:focus {
  box-shadow: 0 0 0 2px #b8912f;
}
.boutons-note {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}
.actions-celebration {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #eae2c8;
}
.principal {
  background: #1e2a3a;
  color: #fff;
  border: none;
  font-family: inherit;
  font-weight: 600;
  font-size: 13px;
  padding: 9px 15px;
  border-radius: 8px;
  cursor: pointer;
}
.secondaire {
  background: transparent;
  color: #5b5340;
  border: 1px solid #dcd2b4;
  font-family: inherit;
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}
.danger {
  background: transparent;
  color: #8b2e2e;
  border: 1px solid #e4c4c4;
  font-family: inherit;
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}
.principal:disabled {
  opacity: 0.6;
  cursor: default;
}
.question {
  font-size: 15px;
  color: #1e2a3a;
  margin: 0 0 6px;
  line-height: 1.5;
}
.mention {
  font-size: 11px;
  color: #8a7d5e;
  line-height: 1.5;
  margin: 16px 0 0;
  padding-top: 14px;
  border-top: 1px solid #eae2c8;
}
</style>
