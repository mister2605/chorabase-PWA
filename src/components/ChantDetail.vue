<script setup>
const props = defineProps({
  chant: { type: Object, default: null },
})

const LITURGICAL = {
  'Avent / Carême': { bg: '#4A2E5C', text: '#F1E9F5' },
  'Noël / Pâques': { bg: '#B8912F', text: '#2A2110' },
  'Temps ordinaire': { bg: '#3E6650', text: '#EAF3EC' },
  'Pentecôte / Fêtes': { bg: '#8B2E2E', text: '#F7E8E8' },
  Mariage: { bg: '#2E5C8B', text: '#E8F0F7' },
}

function couleur(categorieNom) {
  return LITURGICAL[categorieNom] || { bg: '#8A7D5E', text: '#fff' }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="panneau" v-if="chant">
    <span
      class="badge-categorie"
      :style="{ background: couleur(chant.categories?.[0]?.nom).bg, color: couleur(chant.categories?.[0]?.nom).text }"
    >
      {{ chant.categories?.[0]?.nom }}
    </span>

    <h2 class="titre">{{ chant.titre }}</h2>
    <p class="ton">Ton : {{ chant.tonalite || '—' }}</p>

    <div class="pupitres">
      <div v-for="p in chant.pupitres" :key="p.id" class="pupitre-ligne">
        <span class="tag-pupitre">{{ p.nom }}</span>
        <audio v-if="p.pivot?.audio_url" controls class="lecteur-audio-pupitre" :src="p.pivot.audio_url"></audio>
      </div>
    </div>

    <div class="paroles">{{ chant.paroles }}</div>

    <audio v-if="chant.audio_url" controls class="lecteur-audio" :src="chant.audio_url"></audio>
    <p v-if="chant.audio_url" class="legende-audio">Enregistrement général (toutes voix)</p>

    <div class="pied">
      Modifié le {{ formatDate(chant.updated_at) }}
      <span v-if="chant.auteur">par {{ chant.auteur.name }}</span>
    </div>
  </div>

  <div class="panneau vide" v-else>
    <p>Sélectionne un chant dans la liste.</p>
  </div>
</template>

<style scoped>
.panneau {
  background: #fff;
  border: 1px solid #eae2c8;
  border-radius: 12px;
  padding: 28px;
}
.panneau.vide {
  color: #8a7d5e;
  font-size: 14px;
}
.badge-categorie {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 12px;
}
.titre {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-weight: 500;
  margin: 0;
}
.ton {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: #8a7d5e;
  margin-top: 8px;
}
.pupitres {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 20px 0;
}
.pupitre-ligne {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lecteur-audio-pupitre {
  height: 32px;
  flex: 1;
  min-width: 0;
}
.tag-pupitre {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f6f1e4;
  border: 1px solid #eae2c8;
  color: #5b5340;
  flex-shrink: 0;
}
.paroles {
  font-family: 'Fraunces', serif;
  font-size: 17px;
  line-height: 1.7;
  white-space: pre-line;
  margin-bottom: 20px;
}
.lecteur-audio {
  width: 100%;
}
.legende-audio {
  font-size: 11px;
  color: #8a7d5e;
  margin: 6px 0 20px;
}
.pied {
  font-size: 12px;
  color: #8a7d5e;
  padding-top: 16px;
  border-top: 1px solid #eae2c8;
}
</style>
