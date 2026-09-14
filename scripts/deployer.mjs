/**
 * Copie le PWA construit dans le dossier public/ de Laravel.
 *
 * Une seule application est servie en production : Laravel sert l'API ET le
 * PWA depuis le même domaine. Ce script évite de le faire à la main et,
 * surtout, évite d'écraser par accident les fichiers de Laravel (index.php,
 * .htaccess, le lien storage).
 *
 * Usage : npm run deployer
 */
import { cp, readdir, rm, stat, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ici = dirname(fileURLToPath(import.meta.url))
const dist = resolve(ici, '..', 'dist')
const laravelPublic = resolve(ici, '..', '..', 'repertoire-chorale', 'public')

// Fichiers appartenant à Laravel : on n'y touche jamais.
const INTOUCHABLES = new Set(['index.php', '.htaccess', 'robots.txt', 'favicon.ico', 'storage', 'hot'])

function stop(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

if (!existsSync(dist)) {
  stop('Le dossier dist/ n\'existe pas. Lance d\'abord : npm run build')
}

if (!existsSync(laravelPublic)) {
  stop(
    `Dossier Laravel introuvable : ${laravelPublic}\n` +
      "  Les deux projets doivent etre cote a cote (chorabase-pwa/ et repertoire-chorale/)."
  )
}

// 1. On enleve la version precedente du PWA, sans toucher aux fichiers Laravel.
for (const entree of await readdir(laravelPublic)) {
  if (INTOUCHABLES.has(entree)) continue
  await rm(join(laravelPublic, entree), { recursive: true, force: true })
}

// 2. On copie la nouvelle version.
let copies = 0
for (const entree of await readdir(dist)) {
  if (INTOUCHABLES.has(entree)) {
    console.warn(`  ! ${entree} ignore : ce nom appartient a Laravel.`)
    continue
  }
  await cp(join(dist, entree), join(laravelPublic, entree), { recursive: true })
  copies++
}

// 3. Le dossier des audios doit exister, sinon le lien storage casse au deploiement.
const storageAudio = resolve(ici, '..', '..', 'repertoire-chorale', 'storage', 'app', 'public', 'chants', 'audio')
if (!existsSync(storageAudio)) await mkdir(storageAudio, { recursive: true })

const taille = (await stat(join(laravelPublic, 'index.html')).catch(() => null))?.size
console.log(`\n  ${copies} element(s) copie(s) vers repertoire-chorale/public/`)
console.log(`  index.html : ${taille ? taille + ' octets' : 'ABSENT — verifie le build'}`)
console.log('\n  Teste en local : php artisan serve, puis ouvre http://localhost:8000\n')
