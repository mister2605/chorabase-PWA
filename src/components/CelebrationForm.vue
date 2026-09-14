<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { creerCelebration, modifierCelebration } from '../api/celebrations'

const props = defineProps({
  // null = création ; sinon la célébration à modifier
  celebration: { type: Object, default: null },
  chants: { type: Array, default: () => [] },
})
const emit = defineEmits(['fermer', 'enregistre'])

/*
 * Les modèles de déroulé.
 *
 * Ils vivent côté écran et pas en base : ce sont des points de départ pour
 * remplir un formulaire, pas des données. Les garder ici permet d'en corriger
 * un sans migration, et le maître de chœur reste libre de renommer, retirer
 * ou ajouter n'importe quelle ligne — c'est du texte.
 */
const MODELES = {
  messe: [
    'Entrée', 'Kyrie', 'Gloria', 'Psaume', 'Acclamation à l\'Évangile',
    'Offertoire', 'Sanctus', 'Anamnèse', 'Notre Père', 'Agnus Dei',
    'Communion', 'Action de grâce', 'Envoi',
  ],
  mariage: [
    'Entrée', 'Kyrie', 'Gloria', 'Psaume', 'Acclamation à l\'Évangile',
    'Échange des consentements', 'Bénédiction des alliances', 'Offertoire',
    'Sanctus', 'Anamnèse', 'Notre Père', 'Agnus Dei', 'Communion',
    'Chant à Marie', 'Sortie',
  ],
  funerailles: [
    'Accueil du corps', 'Aspersion', 'Psaume', 'Acclamation à l\'Évangile',
    'Offertoire', 'Sanctus', 'Anamnèse', 'Notre Père', 'Agnus Dei',
    'Communion', 'Dernier adieu', 'Sortie',
  ],
  repetition: ['Chant 1', 'Chant 2', 'Chant 3'],
  concert: ['Ouverture', 'Chant 1', 'Chant 2', 'Chant 3', 'Final'],
  autre: ['Chant 1', 'Chant 2'],
}

const TYPES = [
  { valeur: 'messe', libelle: 'Messe' },
  { valeur: 'repetition', libelle: 'Répétition' },
  { valeur: 'mariage', libelle: 'Mariage' },
  { valeur: 'funerailles', libelle: 'Funérailles' },
  { valeur: 'concert', libelle: 'Concert' },
  { valeur: 'autre', libelle: 'Autre' },
]

const modification = computed(() => props.celebration !== null)

const type = ref('messe')
const titre = ref('')
const debutLe = ref('')
const lieu = ref('')
const notes = ref('')
const publiee = ref(false)
const lignes = ref([])

const erreur = ref('')
const enCours = ref(false)

/** "2026-09-20T09:30" — le format attendu par <input type="datetime-local">. */
function pourChampDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function ligneVide(moment = '') {
  return { moment, chant_id: null, titre_libre: '', notes: '' }
}

function appliquerModele(nouveauType) {
  lignes.value = (MODELES[nouveauType] || MODELES.autre).map((m) => ligneVide(m))
}

// Changer de type en cours de saisie ne doit pas effacer un programme déjà
// rempli sans prévenir : on ne réapplique le modèle que si tout est vide.
watch(type, (nouveau) => {
  const toutEstVide = lignes.value.every((l) => !l.chant_id && !l.titre_libre.trim())
  if (toutEstVide) appliquerModele(nouveau)
})

onMounted(() => {
  if (modification.value) {
    const c = props.celebration
    type.value = c.type
    titre.value = c.titre || ''
    debutLe.value = pourChampDate(c.debut_le)
    lieu.value = c.lieu || ''
    notes.value = c.notes || ''
    publiee.value = c.est_publiee
    lignes.value = (c.items || []).map((i) => ({
      moment: i.moment,
      chant_id: i.chant_id,
      titre_libre: i.titre_libre || '',
      notes: i.notes || '',
    }))
    if (!lignes.value.length) appliquerModele(type.value)
  } else {
    appliquerModele('messe')
  }
})

function ajouterLigne() {
  lignes.value.push(ligneVide())
}

function retirerLigne(index) {
  lignes.value.splice(index, 1)
}

function deplacer(index, sens) {
  const cible = index + sens
  if (cible < 0 || cible >= lignes.value.length) return
  const copie = lignes.value.slice()
  ;[copie[index], copie[cible]] = [copie[cible], copie[index]]
  lignes.value = copie
}

const lignesRemplies = computed(
  () => lignes.value.filter((l) => l.chant_id || l.titre_libre.trim()).length
)

async function enregistrer(publier) {
  erreur.value = ''

  if (!debutLe.value) {
    erreur.value = 'Indique la date et l\'heure.'
    return
  }

  enCours.value = true
  try {
    const payload = {
      type: type.value,
      titre: titre.value.trim() || null,
      debut_le: debutLe.value.replace('T', ' ') + ':00',
      lieu: lieu.value.trim() || null,
      notes: notes.value.trim() || null,
      publiee: publier,
      items: lignes.value
        .filter((l) => l.moment.trim() && (l.chant_id || l.titre_libre.trim()))
        .map((l) => ({
          moment: l.moment.trim(),
          chant_id: l.chant_id || null,
          titre_libre: l.chant_id ? null : l.titre_libre.trim() || null,
          notes: l.notes.trim() || null,
        })),
    }

    const enregistree = modification.value
      ? await modifierCelebration(props.celebration.id, payload)
      : await creerCelebration(payload)

    emit('enregistre', enregistree)
  } catch (e) {
    const erreurs = e.response?.data?.errors
    if (erreurs) {
      erreur.value = Object.values(erreurs).flat().join(' ')
    } else if (!e.response) {
      erreur.value = 'Le serveur ne répond pas. Ton programme n\'est pas perdu : réessaie dans un instant.'
    } else {
      erreur.value = e.response?.data?.message || 'Impossible d\'enregistrer.'
    }
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div class="fond" @click.self="emit('fermer')">
    <div class="modale">
      <div class="tete">
        <h2>{{ modification ? 'Modifier le programme' : 'Nouveau programme' }}</h2>
        <button class="fermer" @click="emit('fermer')" aria-label="Fermer">×</button>
      </div>

      <p class="section">La célébration</p>

      <div class="grille">
        <label>
          <span>Type</span>
          <select v-model="type">
            <option v-for="t in TYPES" :key="t.valeur" :value="t.valeur">{{ t.libelle }}</option>
          </select>
        </label>

        <label>
          <span>Date et heure</span>
          <input v-model="debutLe" type="datetime-local" required />
        </label>
      </div>

      <div class="grille">
        <label>
          <span>Intitulé (facultatif)</span>
          <input v-model="titre" placeholder="22e dimanche du temps ordinaire" />
        </label>
        <label>
          <span>Lieu (facultatif)</span>
          <input v-model="lieu" placeholder="Paroisse Notre Dame des Apôtres" />
        </label>
      </div>

      <p class="section">Le déroulé</p>
      <p class="aide">
        Choisis un chant du répertoire, ou écris simplement son titre s'il n'y
        est pas encore. Les deux marchent — tu n'es jamais bloqué.
      </p>

      <div v-for="(ligne, i) in lignes" :key="i" class="ligne">
        <div class="ligne-tete">
          <input v-model="ligne.moment" class="champ-moment" placeholder="Moment" />
          <div class="fleches">
            <button type="button" @click="deplacer(i, -1)" :disabled="i === 0" aria-label="Monter">↑</button>
            <button type="button" @click="deplacer(i, 1)" :disabled="i === lignes.length - 1" aria-label="Descendre">↓</button>
            <button type="button" class="retirer" @click="retirerLigne(i)" aria-label="Retirer">×</button>
          </div>
        </div>

        <select v-model="ligne.chant_id">
          <option :value="null">— Chant écrit à la main —</option>
          <option v-for="c in chants" :key="c.id" :value="c.id">{{ c.titre }}</option>
        </select>

        <input
          v-if="!ligne.chant_id"
          v-model="ligne.titre_libre"
          placeholder="Titre du chant"
        />

        <input v-model="ligne.notes" class="champ-note" placeholder="Consigne (facultatif) : qui commence, quel couplet..." />
      </div>

      <button type="button" class="ajouter" @click="ajouterLigne">+ Ajouter une ligne</button>

      <p class="section">Mot pour la chorale (facultatif)</p>
      <textarea v-model="notes" rows="2" placeholder="Répétition générale samedi à 16h."></textarea>

      <p v-if="erreur" class="erreur">{{ erreur }}</p>

      <div class="pied">
        <span class="compte">{{ lignesRemplies }} chant(s) au programme</span>
        <div class="boutons">
          <button type="button" class="secondaire" :disabled="enCours" @click="enregistrer(false)">
            Garder en brouillon
          </button>
          <button type="button" class="principal" :disabled="enCours" @click="enregistrer(true)">
            {{ enCours ? 'Enregistrement...' : 'Publier' }}
          </button>
        </div>
      </div>

      <p class="mention">
        Un brouillon n'est visible que par toi. Tant qu'il n'est pas publié,
        les choristes ne voient rien — tu peux le préparer en plusieurs fois.
      </p>
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
  z-index: 55;
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
  margin: 0 0 12px;
  line-height: 1.5;
}
.grille {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
label span {
  font-size: 11px;
  color: #8a7d5e;
}
input,
select,
textarea {
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #dcd2b4;
  font-size: 14px;
  font-family: inherit;
  background: #fff;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
input:focus,
select:focus,
textarea:focus {
  box-shadow: 0 0 0 2px #b8912f;
}
.ligne {
  border: 1px solid #eae2c8;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #fdfbf5;
}
.ligne-tete {
  display: flex;
  gap: 8px;
  align-items: center;
}
.champ-moment {
  font-weight: 600;
}
.fleches {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.fleches button {
  background: #fff;
  border: 1px solid #dcd2b4;
  color: #5b5340;
  border-radius: 6px;
  width: 28px;
  height: 30px;
  cursor: pointer;
  font-size: 13px;
}
.fleches button:disabled {
  opacity: 0.35;
  cursor: default;
}
.fleches .retirer {
  color: #8b2e2e;
}
.champ-note {
  font-size: 13px;
}
.ajouter {
  background: transparent;
  border: 1px dashed #dcd2b4;
  color: #5b5340;
  font-family: inherit;
  font-size: 13px;
  padding: 9px;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
}
.erreur {
  background: #fbeaea;
  border: 1px solid #e4c4c4;
  color: #8b2e2e;
  font-size: 13px;
  border-radius: 8px;
  padding: 9px 12px;
  margin: 14px 0 0;
}
.pied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #eae2c8;
}
.compte {
  font-size: 12px;
  color: #8a7d5e;
}
.boutons {
  display: flex;
  gap: 8px;
}
.principal {
  background: #1e2a3a;
  color: #fff;
  border: none;
  font-family: inherit;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
}
.secondaire {
  background: transparent;
  color: #5b5340;
  border: 1px solid #dcd2b4;
  font-family: inherit;
  font-size: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
}
.principal:disabled,
.secondaire:disabled {
  opacity: 0.6;
  cursor: default;
}
.mention {
  font-size: 11px;
  color: #8a7d5e;
  line-height: 1.5;
  margin: 12px 0 0;
}
@media (max-width: 560px) {
  .grille {
    grid-template-columns: 1fr;
  }
}
</style>
