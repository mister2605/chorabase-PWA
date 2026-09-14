<script setup>
import { ref, computed } from 'vue'
import { definirMotDePasse } from '../api/membres'

const props = defineProps({
  token: { type: String, required: true },
  email: { type: String, required: true },
})
const emit = defineEmits(['termine'])

const password = ref('')
const confirmation = ref('')
const erreur = ref('')
const enCours = ref(false)
const reussi = ref(false)

const tropCourt = computed(() => password.value.length > 0 && password.value.length < 8)
const differents = computed(() => confirmation.value.length > 0 && password.value !== confirmation.value)

async function soumettre() {
  erreur.value = ''
  enCours.value = true
  try {
    await definirMotDePasse({
      token: props.token,
      email: props.email,
      password: password.value,
      password_confirmation: confirmation.value,
    })
    reussi.value = true
  } catch (e) {
    const erreurs = e.response?.data?.errors
    erreur.value = erreurs
      ? Object.values(erreurs).flat().join(' ')
      : e.response?.data?.message || 'Impossible d\'enregistrer le mot de passe.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="carte">
      <p class="souslabel">Chorale NDPS · Ouaga 2000</p>
      <h1 class="titre">Chorabase</h1>

      <template v-if="!reussi">
        <p class="intro">
          Bienvenue. Choisis ton mot de passe pour activer ton compte
          <strong>{{ email }}</strong>.
        </p>

        <form @submit.prevent="soumettre">
          <input
            v-model="password"
            type="password"
            placeholder="Nouveau mot de passe (8 caractères minimum)"
            required
            autocomplete="new-password"
          />
          <input
            v-model="confirmation"
            type="password"
            placeholder="Répète le mot de passe"
            required
            autocomplete="new-password"
          />

          <p v-if="tropCourt" class="aide-erreur">8 caractères minimum.</p>
          <p v-else-if="differents" class="aide-erreur">Les deux mots de passe ne sont pas identiques.</p>
          <p v-if="erreur" class="erreur">{{ erreur }}</p>

          <button type="submit" :disabled="enCours || tropCourt || differents || !password">
            {{ enCours ? 'Enregistrement...' : 'Activer mon compte' }}
          </button>
        </form>
      </template>

      <template v-else>
        <p class="succes">Ton mot de passe est enregistré.</p>
        <button @click="emit('termine')">Se connecter</button>
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
  max-width: 380px;
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
  margin: 0 0 16px;
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
input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #dcd2b4;
  font-size: 14px;
  outline: none;
}
input:focus {
  box-shadow: 0 0 0 2px #b8912f;
}
.aide-erreur {
  color: #8a7d5e;
  font-size: 12px;
  margin: 0;
}
.erreur {
  color: #8b2e2e;
  font-size: 13px;
  margin: 0;
}
.succes {
  font-size: 15px;
  color: #3e6650;
  margin: 0 0 18px;
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
</style>
