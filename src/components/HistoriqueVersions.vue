<script setup>
import { ref } from 'vue'

defineProps({
  chant: { type: Object, required: true },
  peutRestaurer: { type: Boolean, default: false },
})
const emit = defineEmits(['fermer', 'restaurer'])

const deplie = ref(null) // id de la version dont on affiche les paroles
const confirmation = ref(null) // id de la version qu'on s'apprête à restaurer

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function basculer(id) {
  deplie.value = deplie.value === id ? null : id
}
</script>

<template>
  <div class="fond" @click.self="emit('fermer')">
    <div class="modale">
      <header class="tete">
        <div>
          <p class="souslabel">Historique des paroles</p>
          <h2>{{ chant.titre }}</h2>
        </div>
        <button class="fermer" @click="emit('fermer')" aria-label="Fermer">×</button>
      </header>

      <div class="version actuelle">
        <div class="entete-version">
          <span class="etiquette-actuelle">Version actuelle</span>
          <span class="date">Modifiée le {{ formatDate(chant.updated_at) }}</span>
        </div>
        <div class="paroles">{{ chant.paroles }}</div>
      </div>

      <p v-if="!chant.versions?.length" class="aide">
        Aucune version antérieure. L'historique se remplira à la première modification des paroles.
      </p>

      <ul v-else class="liste">
        <li v-for="v in chant.versions" :key="v.id" class="version">
          <div class="entete-version">
            <span class="date">{{ formatDate(v.created_at) }}</span>
            <span v-if="v.auteur" class="auteur">par {{ v.auteur.name }}</span>
          </div>

          <div class="actions">
            <button class="bouton-plat" @click="basculer(v.id)">
              {{ deplie === v.id ? 'Masquer' : 'Voir les paroles' }}
            </button>
            <button v-if="peutRestaurer && confirmation !== v.id" class="bouton-plat" @click="confirmation = v.id">
              Restaurer
            </button>
            <template v-if="peutRestaurer && confirmation === v.id">
              <button class="bouton-or" @click="emit('restaurer', v); confirmation = null">
                Confirmer la restauration
              </button>
              <button class="bouton-plat" @click="confirmation = null">Annuler</button>
            </template>
          </div>

          <p v-if="confirmation === v.id" class="aide">
            La version actuelle sera archivée avant d'être remplacée : rien n'est perdu,
            tu pourras revenir en arrière.
          </p>

          <div v-if="deplie === v.id" class="paroles ancienne">{{ v.paroles }}</div>
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
  max-width: 640px;
}
.tete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.souslabel {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #b8912f;
  margin: 0 0 4px;
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
.liste {
  list-style: none;
  padding: 0;
  margin: 0;
}
.version {
  padding: 12px 0;
  border-top: 1px solid #eae2c8;
}
.version.actuelle {
  border-top: none;
  background: #f6f1e4;
  border: 1px solid #eae2c8;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
}
.entete-version {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.etiquette-actuelle {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #3e6650;
  color: #eaf3ec;
}
.date {
  font-size: 12px;
  color: #5b5340;
}
.auteur {
  font-size: 12px;
  color: #8a7d5e;
}
.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.aide {
  font-size: 12px;
  color: #8a7d5e;
  margin: 8px 0 0;
}
.paroles {
  font-family: 'Fraunces', serif;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-line;
  margin-top: 10px;
}
.paroles.ancienne {
  background: #fbf8ef;
  border-left: 3px solid #dcd2b4;
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
}
.bouton-or {
  background: #b8912f;
  color: #1e2a3a;
  border: none;
  font-weight: 600;
  font-size: 12px;
  padding: 7px 12px;
  border-radius: 8px;
  cursor: pointer;
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
</style>
