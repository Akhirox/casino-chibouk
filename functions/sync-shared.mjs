// Copie les règles du poker du site (js/poker) dans functions/shared avant chaque déploiement :
// le serveur et le site utilisent exactement le même code. Lancé tout seul par « firebase deploy » (voir firebase.json).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, 'shared'), { recursive: true });
for (const f of ['engine.js', 'server.js']) copyFileSync(join(here, '..', 'js', 'poker', f), join(here, 'shared', f));
console.log('Règles du poker copiées dans functions/shared');
