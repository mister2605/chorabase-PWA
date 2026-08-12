<script setup>
import { ref } from 'vue'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  pupitres: { type: Array, default: () => [] },
  erreurExterne: { type: String, default: '' },
})

const emit = defineEmits(['fermer', 'publier'])

const titre = ref('')
const paroles = ref('')
const tonalite = ref('')
const categorieId = ref(null)
const pupitreIds = ref([])
const fichierAudio = ref(null)
const nomFichierAudio = ref('')
const audiosParPupitre = ref({}) // { [pupitreId]: File }
const erreur = ref('')

function togglePupitre(id) {
  const dejaChoisi = pupitreIds.value.includes(id)
  pupitreIds.value = dejaChoisi ? pupitreIds.value.filter((p) => p !== id) : [...pupitreIds.value, id]
  // On enlève le fichier audio associé si on décoche le pupitre
  if (dejaChoisi) delete audiosParPupitre.value[id]
}

function surChoixFichierPupitre(pupitreId, e) {
  const fichier = e.target.files[0] || null
  if (fichier) audiosParPupitre.value[pupitreId] = fichier
  else delete audiosParPupitre.value[pupitreId]
}

function surChoixFichier(e) {
  const fichier = e.target.files[0] || null
  fichierAudio.value = fichier
  nomFichierAudio.value = fichier ? fichier.name : ''
}

function soumettre() {
  erreur.value = ''
  if (!titre.value.trim()) {
    erreur.value = 'Le titre est obligatoire.'
    return
  }

  // FormData obligatoire dès qu'on envoie des fichiers (multipart)
  const donnees = new FormData()
  donnees.append('titre', titre.value)
  donnees.append('paroles', paroles.value)
  if (tonalite.value) donnees.append('tonalite', tonalite.value)
  if (categorieId.value) donnees.append('categorie_ids[]', categorieId.value)
  pupitreIds.value.forEach((id) => donnees.append('pupitre_ids[]', id))
  if (fichierAudio.value) donnees.append('audio', fichierAudio.value)
  for (const [pupitreId, fichier] of Object.entries(audiosParPupitre.value)) {
    donnees.append(`audio_pupitre[${pupitreId}]`, fichier)
  }

  emit('publier', donnees)
}
</script>

<template>
  <div class="fond" @click.self="emit('fermer')">
    <div class="modale">
      <button class="fermer" @click="emit('fermer')">✕</button>
      <p class="label">Maître de chœur</p>
      <h3 class="titre-modale">Nouveau chant</h3>

      <form @submit.prevent="soumettre">
        <input v-model="titre" placeholder="Titre du chant" />
        <input v-model="tonalite" placeholder="Tonalité (ex : Ré majeur)" />

        <select v-model="categorieId">
          <option :value="null" disabled>Catégorie</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.nom }}</option>
        </select>

        <div class="pupitres">
          <button
            v-for="p in pupitres"
            :key="p.id"
            type="button"
            class="chip"
            :class="{ actif: pupitreIds.includes(p.id) }"
            @click="togglePupitre(p.id)"
          >
            {{ p.nom }}
          </button>
        </div>

        <div v-if="pupitreIds.length" class="audios-pupitres">
          <label v-for="id in pupitreIds" :key="id" class="champ-fichier-pupitre">
            <span class="nom-pupitre">{{ pupitres.find((p) => p.id === id)?.nom }}</span>
            <span class="etat-fichier">
              {{ audiosParPupitre[id]?.name || '🎵 Choisir un audio' }}
            </span>
            <input type="file" accept="audio/*" @change="surChoixFichierPupitre(id, $event)" hidden />
          </label>
        </div>

        <textarea v-model="paroles" placeholder="Paroles..." rows="6"></textarea>

        <label class="champ-fichier">
          <span>{{ nomFichierAudio || '🎵 Audio général (optionnel, toutes voix)' }}</span>
          <input type="file" accept="audio/*" @change="surChoixFichier" hidden />
        </label>

        <p v-if="erreur || erreurExterne" class="erreur">{{ erreur || erreurExterne }}</p>

        <button type="submit" class="publier">Publier — visible par tous immédiatement</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.fond {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 10;
}
.modale {
  background: #f6f1e4;
  border-radius: 12px;
  max-width: 420px;
  width: 100%;
  padding: 24px;
  position: relative;
}
.fermer {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #8a7d5e;
  font-size: 16px;
  cursor: pointer;
}
.label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #b8912f;
  margin: 0 0 4px;
}
.titre-modale {
  font-family: 'Fraunces', serif;
  font-size: 20px;
  margin: 0 0 16px;
}
form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
input,
select,
textarea {
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid #dcd2b4;
  background: #fff;
  font-size: 14px;
  outline: none;
}
textarea {
  resize: none;
}
.pupitres {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid #dcd2b4;
  background: #fff;
  color: #5b5340;
  cursor: pointer;
}
.chip.actif {
  background: #1e2a3a;
  color: #fff;
  border-color: #1e2a3a;
}
.champ-fichier {
  display: block;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px dashed #b8912f;
  background: #fff;
  font-size: 13px;
  color: #8a7d5e;
  cursor: pointer;
  text-align: center;
}
.audios-pupitres {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #fbf8ee;
  border-radius: 8px;
  padding: 10px;
}
.champ-fichier-pupitre {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
}
.nom-pupitre {
  font-weight: 600;
  color: #1e2a3a;
  flex-shrink: 0;
}
.etat-fichier {
  color: #8a7d5e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.erreur {
  color: #8b2e2e;
  font-size: 13px;
  margin: 0;
}
.publier {
  background: #1e2a3a;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  padding: 11px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  margin-top: 6px;
}
</style>
