<script setup>
import { ref, computed, onMounted } from 'vue'
import { infosAdhesion, rejoindreChorale } from '../api/adhesion'

const props = defineProps({
  code: { type: String, required: true },
})
const emit = defineEmits(['inscrit', 'lien-invalide'])

const chorale = ref(null)
const pupitres = ref([])
const chargement = ref(true)

const form = ref({ name: '', email: '', pupitre_id: null, password: '', password_confirmation: '' })
const erreur = ref('')
const enCours = ref(false)

// Message affiché à la place du formulaire quand on n'a PAS pu charger la
// chorale, mais que le lien n'est pas en cause (réseau coupé, serveur
// injoignable, trop de monde en même temps). Dans ces cas-là on propose de
// réessayer : dire "lien invalide" enverrait le choriste redemander un lien
// qui, lui, est parfaitement valable.
const blocage = ref(null)

const tropCourt = computed(() => form.value.password.length > 0 && form.value.password.length < 8)
const differents = computed(
  () => form.value.password_confirmation.length > 0 && form.value.password !== form.value.password_confirmation
)
const pretAEnvoyer = computed(
  () => form.value.name.trim() && form.value.email.trim() && form.value.password && !tropCourt.value && !differents.value
)

async function charger() {
  chargement.value = true
  blocage.value = null

  try {
    const data = await infosAdhesion(props.code)
    // Garde-fou : si le proxy de developpement n'est pas configure, le serveur
    // Vite renvoie index.html avec un code 200. axios ne leve alors aucune
    // erreur et on se retrouverait avec un ecran blanc, sans explication.
    if (!data || typeof data !== 'object' || !data.chorale) {
      throw new Error('reponse inattendue')
    }
    chorale.value = data.chorale
    pupitres.value = data.pupitres || []
  } catch (e) {
    const statut = e.response?.status

    // Seul le serveur peut dire qu'un lien n'existe pas ou a été refermé.
    if (statut === 404 || statut === 403 || statut === 410) {
      emit('lien-invalide')
    } else if (statut === 429) {
      blocage.value =
        "Beaucoup de monde ouvre le lien en même temps. Attends une minute, puis appuie sur Réessayer. Ton lien reste valable."
    } else if (! e.response) {
      // Pas de réponse du tout : réseau coupé, ou ordinateur-serveur éteint.
      blocage.value =
        "Impossible de joindre le serveur. Vérifie ta connexion et réessaie — le lien, lui, est bon."
    } else {
      blocage.value =
        "Le serveur n'a pas répondu correctement. Réessaie dans un instant, ou préviens le maître de chœur."
    }
  } finally {
    chargement.value = false
  }
}

async function soumettre() {
  erreur.value = ''
  enCours.value = true
  try {
    const utilisateur = await rejoindreChorale(props.code, form.value)
    emit('inscrit', utilisateur)
  } catch (e) {
    const erreurs = e.response?.data?.errors

    if (e.response?.status === 429) {
      erreur.value =
        "Trop d'inscriptions en même temps. Attends une minute et appuie de nouveau sur « Créer mon compte » — rien n'est perdu."
    } else if (! e.response) {
      erreur.value = "Connexion interrompue. Vérifie ton réseau et réessaie."
    } else {
      erreur.value = erreurs
        ? Object.values(erreurs).flat().join(' ')
        : e.response?.data?.message || "Impossible de créer le compte pour le moment."
    }
  } finally {
    enCours.value = false
  }
}

onMounted(charger)
</script>

<template>
  <div class="page">
    <div class="carte">
      <p v-if="chargement" class="aide">Chargement...</p>

      <template v-else-if="blocage">
        <p class="souslabel">Chorabase</p>
        <h1 class="titre">On réessaie ?</h1>
        <p class="intro">{{ blocage }}</p>
        <button type="button" @click="charger">Réessayer</button>
      </template>

      <template v-else-if="chorale">
        <p class="souslabel">{{ chorale.nom }}<span v-if="chorale.ville"> · {{ chorale.ville }}</span></p>
        <h1 class="titre">Rejoindre la chorale</h1>
        <p class="intro">
          Crée ton compte pour accéder au répertoire : les paroles, la tonalité
          et l'enregistrement audio de ta voix pour chaque chant.
        </p>

        <form @submit.prevent="soumettre">
          <input v-model="form.name" placeholder="Ton nom complet" required autocomplete="name" />
          <input v-model="form.email" type="email" placeholder="Ton email" required autocomplete="email" />

          <select v-model="form.pupitre_id">
            <option :value="null">Ton pupitre (tu pourras le changer plus tard)</option>
            <option v-for="p in pupitres" :key="p.id" :value="p.id">{{ p.nom }}</option>
          </select>

          <input
            v-model="form.password"
            type="password"
            placeholder="Choisis un mot de passe (8 caractères minimum)"
            required
            autocomplete="new-password"
          />
          <input
            v-model="form.password_confirmation"
            type="password"
            placeholder="Répète le mot de passe"
            required
            autocomplete="new-password"
          />

          <p v-if="tropCourt" class="aide-erreur">8 caractères minimum.</p>
          <p v-else-if="differents" class="aide-erreur">Les deux mots de passe ne sont pas identiques.</p>
          <p v-if="erreur" class="erreur">{{ erreur }}</p>

          <button type="submit" :disabled="enCours || !pretAEnvoyer">
            {{ enCours ? 'Création...' : 'Créer mon compte' }}
          </button>
        </form>

        <p class="mention">
          Tu rejoins la chorale comme choriste. Le maître de chœur pourra
          t'attribuer d'autres droits ensuite s'il le souhaite.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f1e4;
  padding: 20px;
}
.carte {
  background: #fff;
  border: 1px solid #eae2c8;
  border-radius: 12px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
}
.souslabel {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #b8912f;
  margin: 0 0 4px;
}
.titre {
  font-family: 'Fraunces', serif;
  font-size: 26px;
  font-weight: 500;
  color: #1e2a3a;
  margin: 0 0 12px;
}
.intro {
  font-size: 14px;
  line-height: 1.6;
  color: #5b5340;
  margin: 0 0 20px;
}
form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
input,
select {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #dcd2b4;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  background: #fff;
}
input:focus,
select:focus {
  box-shadow: 0 0 0 2px #b8912f;
}
.aide,
.aide-erreur {
  font-size: 12px;
  color: #8a7d5e;
  margin: 0;
}
.erreur {
  color: #8b2e2e;
  font-size: 13px;
  margin: 0;
}
button {
  background: #1e2a3a;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  padding: 11px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  margin-top: 6px;
  width: 100%;
}
button:disabled {
  opacity: 0.6;
  cursor: default;
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
