import axios from 'axios'

const http = axios.create({ baseURL: '/api', withCredentials: true })

// --- Identité de la chorale ---

export async function renommerChorale({ nom, ville }) {
  const { data } = await http.put('/chorale', { nom, ville })
  return data
}

// --- Pupitres ---

export async function creerPupitre(nom) {
  const { data } = await http.post('/pupitres', { nom })
  return data
}

export async function renommerPupitre(id, nom) {
  const { data } = await http.put(`/pupitres/${id}`, { nom })
  return data
}

export async function supprimerPupitre(id) {
  await http.delete(`/pupitres/${id}`)
}

// --- Catégories ---

export async function creerCategorie(nom) {
  const { data } = await http.post('/categories', { nom })
  return data
}

export async function renommerCategorie(id, nom) {
  const { data } = await http.put(`/categories/${id}`, { nom })
  return data
}

export async function supprimerCategorie(id) {
  await http.delete(`/categories/${id}`)
}
