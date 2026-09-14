import axios from 'axios'

const http = axios.create({ baseURL: '/api', withCredentials: true })

/** Les célébrations à venir, ou les passées si on demande l'historique. */
export async function fetchCelebrations({ passees = false } = {}) {
  const { data } = await http.get('/celebrations', { params: passees ? { passees: 1 } : {} })
  return data
}

export async function fetchCelebration(id) {
  const { data } = await http.get(`/celebrations/${id}`)
  return data
}

export async function creerCelebration(payload) {
  const { data } = await http.post('/celebrations', payload)
  return data
}

export async function modifierCelebration(id, payload) {
  const { data } = await http.put(`/celebrations/${id}`, payload)
  return data
}

export async function supprimerCelebration(id) {
  await http.delete(`/celebrations/${id}`)
}

/**
 * La seule écriture ouverte aux instrumentistes : leur note sur une ligne.
 * Volontairement séparée du reste — ce point d'entrée ne sait rien modifier
 * d'autre.
 */
export async function annoterItem(celebrationId, itemId, note) {
  const { data } = await http.patch(
    `/celebrations/${celebrationId}/items/${itemId}/note-instrument`,
    { note_instrument: note }
  )
  return data
}
