<script setup>
import { ref } from 'vue'
import { login } from '../api/auth'

const emit = defineEmits(['connecte'])

const email = ref('')
const password = ref('')
const erreur = ref('')
const enCours = ref(false)

async function soumettre() {
  erreur.value = ''
  enCours.value = true
  try {
    const utilisateur = await login(email.value, password.value)
    emit('connecte', utilisateur)
  } catch (e) {
    // Pas de reponse du tout = la requete n'est jamais arrivee. Ce n'est pas
    // un probleme de mot de passe, et le dire evite qu'un choriste s'acharne
    // sur ses identifiants alors que c'est le lien qui est perime.
    if (! e.response) {
      erreur.value =
        "Le serveur ne répond pas. Vérifie ta connexion internet — " +
        'et si ça persiste, demande le lien à jour au maître de chœur.'
    } else if (e.response.status === 429) {
      erreur.value = 'Trop de tentatives. Attends une minute avant de réessayer.'
    } else {
      // Message du serveur : il distingue un mot de passe faux d'un compte
      // pas encore active, ce qu'un texte fige ne peut pas faire.
      erreur.value = e.response.data?.message || 'Impossible de se connecter pour le moment.'
    }
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="carte">
      <p class="souslabel">Répertoire de chorale</p>
      <h1 class="titre">Chorabase</h1>

      <form @submit.prevent="soumettre">
        <input v-model="email" type="email" placeholder="Email" required autocomplete="username" />
        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe"
          required
          autocomplete="current-password"
        />
        <p v-if="erreur" class="erreur">{{ erreur }}</p>
        <button type="submit" :disabled="enCours">
          {{ enCours ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>

      <!--
        Sans cette mention, l'ecran de connexion est une impasse muette pour
        quelqu'un qui n'a pas encore de compte : il tape son email, echoue,
        recommence, et abandonne. On ne met PAS de lien d'inscription ici —
        l'acces a la chorale passe par le lien d'adhesion, qui est le secret.
      -->
      <p class="mention">
        Pas encore de compte ? Demande le lien d'inscription au maître de chœur :
        l'accès à la chorale se fait uniquement par ce lien.
      </p>
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
  max-width: 360px;
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
  margin: 0 0 24px;
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
}
button:disabled {
  opacity: 0.6;
  cursor: default;
}
.mention {
  font-size: 12px;
  line-height: 1.5;
  color: #8a7d5e;
  margin: 18px 0 0;
  padding-top: 14px;
  border-top: 1px solid #eae2c8;
}
</style>
