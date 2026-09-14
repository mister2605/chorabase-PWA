import axios from 'axios'
import { initialiserCsrf } from './auth'

const http = axios.create({ baseURL: '/api', withCredentials: true })
const racine = axios.create({ baseURL: '/', withCredentials: true })

export async function fetchMembres() {
  const { data } = await http.get('/membres')
  return data
}

/** Renvoie { membre, lien_invitation } */
export async function creerMembre(payload) {
  const { data } = await http.post('/membres', payload)
  return data
}

/** Régénère un lien pour un membre qui a perdu le sien. */
export async function regenererInvitation(id) {
  const { data } = await http.post(`/membres/${id}/invitation`)
  return data.lien_invitation
}

export async function modifierMembre(id, payload) {
  const { data } = await http.put(`/membres/${id}`, payload)
  return data
}

export async function supprimerMembre(id) {
  await http.delete(`/membres/${id}`)
}

/**
 * Route publique (hors /api) : le choriste définit son mot de passe.
 * Elle est protégée par le jeton CSRF comme /login, d'où l'appel préalable.
 */
export async function definirMotDePasse({ token, email, password, password_confirmation }) {
  await initialiserCsrf()
  const { data } = await racine.post('/invitation/definir-mot-de-passe', {
    token,
    email,
    password,
    password_confirmation,
  })
  return data
}

// --- Réglages de la chorale (lien d'adhésion) ---

/** Renvoie { nom, ville, adhesion_ouverte, lien_adhesion }. */
export async function fetchChorale() {
  const { data } = await http.get('/chorale')
  return data
}

/** Ouvre ou ferme l'adhésion en libre-service. */
export async function basculerAdhesion(ouverte) {
  const { data } = await http.post('/chorale/adhesion', { ouverte })
  return data
}

/** Régénère le code : l'ancien lien devient immédiatement inutilisable. */
export async function regenererAdhesion() {
  const { data } = await http.post('/chorale/adhesion/regenerer')
  return data
}
