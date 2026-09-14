<script setup>
import { ref, onMounted } from 'vue'

/**
 * Bandeau d'installation pour iPhone et iPad.
 *
 * Android propose tout seul un bouton "Installer". iOS ne propose rien :
 * l'utilisateur doit savoir passer par Partager > Sur l'écran d'accueil.
 * Sans indication, un choriste sur iPhone reste sur une page web, n'a jamais
 * l'icône sur son téléphone, et ne revient pas.
 *
 * Le bandeau n'apparaît que si les trois conditions sont réunies :
 *  - on est sur iOS
 *  - l'appli n'est PAS déjà installée
 *  - la personne ne l'a pas déjà écarté
 */
const CLE_MASQUE = 'chorabase.bandeau-ios-masque'

const visible = ref(false)

function estIos() {
  const ua = navigator.userAgent
  // Les iPad récents se présentent comme des Mac : on les reconnaît à l'écran tactile.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function dejaInstallee() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)')?.matches === true
  )
}

function masquer() {
  visible.value = false
  try {
    localStorage.setItem(CLE_MASQUE, '1')
  } catch {
    // Navigation privée : tant pis, le bandeau réapparaîtra. Rien de grave.
  }
}

onMounted(() => {
  let ecarte = false
  try {
    ecarte = localStorage.getItem(CLE_MASQUE) === '1'
  } catch {
    ecarte = false
  }

  visible.value = estIos() && ! dejaInstallee() && ! ecarte
})
</script>

<template>
  <div v-if="visible" class="bandeau">
    <div class="texte">
      <p class="titre">Installe Chorabase sur ton iPhone</p>
      <p class="etapes">
        Appuie sur
        <span class="icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16V4" />
            <path d="M8 8l4-4 4 4" />
            <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
          </svg>
        </span>
        <strong>Partager</strong> en bas de l'écran, puis
        <strong>Sur l'écran d'accueil</strong>.
      </p>
      <p class="note">À faire depuis Safari.</p>
    </div>
    <button class="fermer" @click="masquer" aria-label="Masquer">×</button>
  </div>
</template>

<style scoped>
.bandeau {
  position: fixed;
  left: 12px;
  right: 12px;
  /* Au-dessus de la barre d'outils de Safari, et de l'encoche sur les modèles récents */
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: #1e2a3a;
  color: #f6f1e4;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: 0 6px 24px rgba(30, 42, 58, 0.28);
  z-index: 80;
}
.texte {
  flex: 1;
  min-width: 0;
}
.titre {
  font-weight: 600;
  font-size: 14px;
  margin: 0 0 4px;
}
.etapes {
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  color: #cfc6ab;
}
.etapes strong {
  color: #f6f1e4;
  font-weight: 600;
}
.icone {
  display: inline-flex;
  vertical-align: -3px;
  color: #b8912f;
  margin: 0 1px;
}
.note {
  font-size: 11px;
  color: #8f9aab;
  margin: 6px 0 0;
}
.fermer {
  background: none;
  border: none;
  color: #8f9aab;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
  flex-shrink: 0;
}
</style>
