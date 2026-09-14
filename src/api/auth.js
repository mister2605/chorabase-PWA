import axios from 'axios'

// Deux instances : une pour les appels /api/*, une pour /sanctum/csrf-cookie
// qui n'est PAS sous le préfixe /api.
const http = axios.create({ baseURL: '/api', withCredentials: true })
const racine = axios.create({ baseURL: '/', withCredentials: true })

export async function initialiserCsrf() {
  await racine.get('/sanctum/csrf-cookie')
}

export async function login(email, password) {
  await initialiserCsrf()
  const { data } = await racine.post('/login', { email, password })
  return data
}

/**
 * Vide ce que le téléphone garde de la personne connectée.
 *
 * Depuis qu'on garde la session et la liste des chants pour le mode hors
 * ligne, se déconnecter ne suffit plus : sans ce ménage, la personne
 * suivante qui ouvre l'appli sur le même téléphone, sans réseau, verrait
 * réapparaître le compte et le répertoire du précédent.
 *
 * Les audios ne sont pas effacés : ce sont de gros fichiers, ils ne
 * désignent personne, et les reprendre coûterait du forfait pour rien.
 */
async function viderCachesDeSession() {
  if (typeof caches === 'undefined') return
  try {
    await Promise.all([caches.delete('session-api-cache'), caches.delete('chants-api-cache')])
  } catch {
    // Navigation privée, stockage refusé : la déconnexion doit aboutir quand même.
  }
}

export async function logout() {
  try {
    await racine.post('/logout')
  } finally {
    // Même si le serveur n'a pas répondu, on nettoie le téléphone : une
    // déconnexion qui laisse les données en place est pire que pas de
    // déconnexion du tout, parce qu'on la croit faite.
    await viderCachesDeSession()
  }
}

export async function utilisateurCourant() {
  try {
    const { data } = await http.get('/user')
    return data
  } catch {
    return null // pas connecté
  }
}
