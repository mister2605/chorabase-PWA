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

export async function logout() {
  await racine.post('/logout')
}

export async function utilisateurCourant() {
  try {
    const { data } = await http.get('/user')
    return data
  } catch {
    return null // pas connecté
  }
}
