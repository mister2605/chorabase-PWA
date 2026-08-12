import axios from 'axios'

// withCredentials : nécessaire pour Sanctum SPA (auth par cookie, pas par token
// à gérer à la main). Le domaine du front doit être dans SANCTUM_STATEFUL_DOMAINS
// côté Laravel (.env).
const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export async function fetchChants({ q = '', pupitreId = null } = {}) {
  const { data } = await http.get('/chants', {
    params: { q, pupitre_id: pupitreId },
  })
  return data
}

export async function fetchChant(id) {
  const { data } = await http.get(`/chants/${id}`)
  return data
}

export async function createChant(payload) {
  const { data } = await http.post('/chants', payload)
  return data
}

export async function updateChantParoles(id, paroles) {
  const { data } = await http.put(`/chants/${id}`, { paroles })
  return data
}

export async function fetchPupitres() {
  const { data } = await http.get('/pupitres')
  return data
}

export async function fetchCategories() {
  const { data } = await http.get('/categories')
  return data
}

export default http
