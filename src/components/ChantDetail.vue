<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  chant: { type: Object, default: null },
  /**
   * Pupitre du choriste connecté. null pour un instrumentiste, ou quand
   * personne n'a renseigné le pupitre : dans ce cas on affiche tout, comme
   * avant. Mieux vaut trop montrer que de laisser quelqu'un devant un écran
   * vide en concluant que l'appli est cassée.
   */
  pupitreUtilisateur: { type: Number, default: null },
})
defineEmits(['voir-historique'])

/*
 * « MA VOIX » D'ABORD.
 *
 * Retour des choristes : voir les quatre voix encombre, on cherche la sienne
 * à chaque fois. On ouvre donc sur sa propre voix, et les autres restent à
 * un clic — volontairement, car on apprend son entrée en écoutant la voix
 * d'à côté, et parce qu'un pupitre mal renseigné ne doit jamais aboutir à un
 * écran vide.
 *
 * C'est de l'affichage, pas une règle de sécurité : le serveur continue
 * d'envoyer toutes les voix. Il n'y a rien de confidentiel dans une
 * partition de chorale.
 */
const toutesLesVoix = ref(false)

const voixDuChant = computed(() => props.chant?.pupitres ?? [])

const maVoix = computed(() =>
  props.pupitreUtilisateur === null
    ? null
    : voixDuChant.value.find((p) => p.id === props.pupitreUtilisateur) ?? null
)

const autresVoix = computed(() =>
  maVoix.value ? voixDuChant.value.filter((p) => p.id !== maVoix.value.id) : []
)

/** Aucun pupitre connu, ou le chant n'a rien pour ma voix : on montre tout. */
const afficherTout = computed(() => toutesLesVoix.value || maVoix.value === null)

const voixAffichees = computed(() =>
  afficherTout.value ? voixDuChant.value : [maVoix.value]
)

// En changeant de chant, on revient sur sa propre voix : sinon le choix fait
// sur un chant se propage silencieusement à tous les suivants.
watch(
  () => props.chant?.id,
  () => {
    toutesLesVoix.value = false
  }
)

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
      <div
        v-for="p in voixAffichees"
        :key="p.id"
        class="pupitre-ligne"
        :class="{ 'ma-voix': p.id === maVoix?.id }"
      >
        <span class="tag-pupitre">
          {{ p.nom }}<span v-if="p.id === maVoix?.id" class="mention-ma-voix"> · ta voix</span>
        </span>
        <audio v-if="p.pivot?.audio_url" controls class="lecteur-audio-pupitre" :src="p.pivot.audio_url"></audio>
        <span v-else class="sans-audio">pas d'enregistrement</span>
      </div>

      <button
        v-if="maVoix && autresVoix.length"
        class="lien-autres-voix"
        type="button"
        @click="toutesLesVoix = !toutesLesVoix"
      >
        {{ toutesLesVoix ? 'Ne montrer que ma voix' : `Écouter les autres voix (${autresVoix.length})` }}
      </button>
    </div>

    <div class="paroles">{{ chant.paroles }}</div>

    <audio v-if="chant.audio_url" controls class="lecteur-audio" :src="chant.audio_url"></audio>
    <p v-if="chant.audio_url" class="legende-audio">Enregistrement général (toutes voix)</p>

    <div class="pied">
      <span>
        Modifié le {{ formatDate(chant.updated_at) }}
        <span v-if="chant.auteur">par {{ chant.auteur.name }}</span>
      </span>
      <button class="lien-historique" @click="$emit('voir-historique')">
        Historique<span v-if="chant.versions?.length"> ({{ chant.versions.length }})</span>
      </button>
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
.pupitre-ligne.ma-voix .tag-pupitre {
  background: #1e2a3a;
  border-color: #1e2a3a;
  color: #f6f1e4;
}
.mention-ma-voix {
  color: #b8912f;
}
.sans-audio {
  font-size: 11px;
  color: #8a7d5e;
  font-style: italic;
}
.lien-autres-voix {
  align-self: flex-start;
  background: transparent;
  border: none;
  color: #8a7d5e;
  font-family: inherit;
  font-size: 12px;
  text-decoration: underline;
  text-underline-offset: 3px;
  padding: 2px 0;
  margin-top: 2px;
  cursor: pointer;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.lien-historique {
  background: transparent;
  border: 1px solid #dcd2b4;
  color: #5b5340;
  font-size: 12px;
  font-family: inherit;
  padding: 6px 11px;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
}
</style>
