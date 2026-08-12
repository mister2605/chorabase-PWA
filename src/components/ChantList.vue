<script setup>
const props = defineProps({
  chants: { type: Array, required: true },
  selectedId: { type: [Number, String], default: null },
  query: { type: String, default: '' },
  pupitres: { type: Array, default: () => [] },
  pupitreFiltre: { type: [Number, String], default: null },
})

const emit = defineEmits(['update:query', 'select', 'filtrer-pupitre'])

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

function estRecent(misAJour) {
  if (!misAJour) return false
  const diffJours = (Date.now() - new Date(misAJour).getTime()) / 86400000
  return diffJours < 1
}
</script>

<template>
  <div>
    <input
      class="recherche"
      :value="query"
      @input="emit('update:query', $event.target.value)"
      placeholder="Chercher un chant..."
    />

    <div class="filtres">
      <button
        class="chip"
        :class="{ actif: pupitreFiltre === null }"
        @click="emit('filtrer-pupitre', null)"
      >
        Tous
      </button>
      <button
        v-for="p in pupitres"
        :key="p.id"
        class="chip"
        :class="{ actif: pupitreFiltre === p.id }"
        @click="emit('filtrer-pupitre', pupitreFiltre === p.id ? null : p.id)"
      >
        {{ p.nom }}
      </button>
    </div>

    <div class="liste">
      <button
        v-for="chant in chants"
        :key="chant.id"
        class="carte"
        :class="{ selectionne: chant.id === selectedId }"
        :style="{ borderLeftColor: couleur(chant.categories?.[0]?.nom).bg }"
        @click="emit('select', chant.id)"
      >
        <p class="titre">{{ chant.titre }}</p>
        <div class="meta">
          <span class="categorie">{{ chant.categories?.[0]?.nom }}</span>
          <span v-if="estRecent(chant.updated_at)" class="badge-recent">
            Mis à jour aujourd'hui
          </span>
        </div>
      </button>

      <p v-if="chants.length === 0" class="vide">Aucun chant ne correspond à cette recherche.</p>
    </div>
  </div>
</template>

<style scoped>
.recherche {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #dcd2b4;
  background: #fff;
  font-size: 14px;
  outline: none;
  margin-bottom: 12px;
}
.recherche:focus {
  box-shadow: 0 0 0 2px #b8912f;
}
.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}
.chip {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid #dcd2b4;
  background: transparent;
  color: #5b5340;
  cursor: pointer;
}
.chip.actif {
  background: #1e2a3a;
  color: #fff;
  border-color: #1e2a3a;
}
.liste {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.carte {
  text-align: left;
  background: #fff;
  border: 1px solid #eae2c8;
  border-left-width: 4px;
  border-radius: 4px 8px 8px 4px;
  padding: 12px 14px;
  cursor: pointer;
}
.carte:hover {
  background: #fbf8ee;
}
.carte.selectionne {
  box-shadow: 0 0 0 2px #b8912f;
}
.titre {
  font-family: 'Fraunces', serif;
  font-size: 15px;
  font-weight: 500;
  margin: 0;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.categorie {
  font-size: 11px;
  color: #8a7d5e;
}
.badge-recent {
  font-size: 10px;
  font-weight: 600;
  color: #3e6650;
}
.vide {
  font-size: 14px;
  color: #8a7d5e;
  padding: 16px 4px;
}
</style>
