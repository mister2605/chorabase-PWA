import axios from 'axios'
import { initialiserCsrf } from './auth'

// Routes publiques (hors /api) : un visiteur non connecté les appelle.
const racine = axios.create({ baseURL: '/', withCredentials: true })

/** De quelle chorale s'agit-il ? Renvoie aussi la liste des pupitres. */
export async function infosAdhesion(code) {
  const { data } = await racine.get(`/adhesion/${encodeURIComponent(code)}`)
  return data
}

/** Le choriste crée son compte. Il est connecté dans la foulée. */
export async function rejoindreChorale(code, payload) {
  await initialiserCsrf()
  const { data } = await racine.post(`/adhesion/${encodeURIComponent(code)}`, payload)
  return data
}
