// Migration du Casino Chibouk d'un projet Firebase vers un autre : comptes des joueurs (mêmes identifiants, mêmes
// mots de passe) et base Firestore (toutes les collections). Marche avec le forfait gratuit Spark (pas besoin de Blaze).
//
// 1. npm install firebase-admin      (dans un dossier à part, hors du site publié)
// 2. node migrate-firebase.mjs --from ancien.json --to nouveau.json --hash hash.txt --dry      (compte, n'écrit rien)
// 3. node migrate-firebase.mjs --from ancien.json --to nouveau.json --hash hash.txt            (copie pour de vrai)
//
//  --from / --to : clés de compte de service (Console Firebase > Paramètres du projet > Comptes de service >
//                  « Générer une nouvelle clé privée »). Ces fichiers donnent tous les droits : ne jamais les publier.
//  --hash        : paramètres de hachage des mots de passe de l'ANCIEN projet (Authentication > Utilisateurs >
//                  menu ⋮ > « Paramètres de hachage des mots de passe »), collés tels quels dans un fichier texte.
//  --dry         : compte seulement (comptes et documents), n'écrit rien
//  --skip a,b    : collections à ne pas copier (ex. --skip logs,feed pour économiser le quota d'écritures)
//  --only a,b    : copier seulement ces collections (pour finir une copie un autre jour)
//  --no-auth     : ne pas copier les comptes ;  --no-db : ne pas copier la base
//  --force       : écrire même si la nouvelle base contient déjà des joueurs
//
// Quotas gratuits Spark : 50 000 lectures et 20 000 écritures par jour et par projet. Le script s'arrête avant de
// dépasser 19 000 écritures ; relance-le le lendemain avec --only pour les collections restantes.
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const flag = (k) => args.includes('--' + k);
const list = (k) => (opt(k) || '').split(',').map((s) => s.trim()).filter(Boolean);
const DRY = flag('dry'), SKIP = list('skip'), ONLY = list('only');
const WRITE_MAX = 19000;

if (!opt('from') || !opt('to')) {
  console.error('Usage : node migrate-firebase.mjs --from ancien.json --to nouveau.json --hash hash.txt [--dry] [--skip logs] [--only users]');
  process.exit(1);
}
const keyA = JSON.parse(readFileSync(opt('from'), 'utf8')), keyB = JSON.parse(readFileSync(opt('to'), 'utf8'));
if (keyA.project_id === keyB.project_id) { console.error('Les deux clés sont du même projet : vérifie --from et --to.'); process.exit(1); }
const A = initializeApp({ credential: cert(keyA) }, 'ancien'), Bp = initializeApp({ credential: cert(keyB) }, 'nouveau');
const dbA = getFirestore(A), dbB = getFirestore(Bp);
console.log(`Ancien projet : ${keyA.project_id}  →  nouveau projet : ${keyB.project_id}${DRY ? '   (essai : rien ne sera écrit)' : ''}\n`);

/* ---------------------------- comptes ---------------------------- */
// Lit les paramètres de hachage collés depuis la console (base64_signer_key, base64_salt_separator, rounds, mem_cost)
function readHash(file) {
  const t = readFileSync(file, 'utf8');
  const get = (k) => { const m = t.match(new RegExp(k + '\\s*[:=]\\s*"?([^,"\\s}]+)')); return m ? m[1] : null; };
  const h = { key: get('base64_signer_key'), sep: get('base64_salt_separator'), rounds: +get('rounds'), mem: +get('mem_cost') };
  if (!h.key || !h.sep || !h.rounds || !h.mem) throw new Error(`Paramètres de hachage incomplets dans ${file} (il faut base64_signer_key, base64_salt_separator, rounds et mem_cost)`);
  return h;
}

async function migrateAuth() {
  const authA = getAuth(A), authB = getAuth(Bp);
  const users = [];
  let token;
  do { const r = await authA.listUsers(1000, token); users.push(...r.users); token = r.pageToken; } while (token);
  console.log(`Comptes : ${users.length} dans l'ancien projet`);
  const noHash = users.filter((u) => u.providerData.some((p) => p.providerId === 'password') && !u.passwordHash);
  if (noHash.length) throw new Error(`${noHash.length} compte(s) sans mot de passe lisible : la clé de l'ancien projet n'a pas le droit de lire les mots de passe (rôle « Administrateur Firebase Authentication » nécessaire)`);
  if (DRY) return;
  if (!opt('hash')) throw new Error('Il faut --hash (paramètres de hachage des mots de passe de l\'ancien projet)');
  const h = readHash(opt('hash'));
  const recs = users.map((u) => {
    const r = { uid: u.uid, emailVerified: !!u.emailVerified, disabled: !!u.disabled };
    if (u.email) r.email = u.email;
    if (u.displayName) r.displayName = u.displayName;
    if (u.photoURL) r.photoURL = u.photoURL;
    if (u.customClaims) r.customClaims = u.customClaims;
    if (u.passwordHash) { r.passwordHash = Buffer.from(u.passwordHash, 'base64'); r.passwordSalt = Buffer.from(u.passwordSalt || '', 'base64'); }
    r.metadata = { creationTime: u.metadata.creationTime, ...(u.metadata.lastSignInTime ? { lastSignInTime: u.metadata.lastSignInTime } : {}) };
    return r;
  });
  let ok = 0;
  for (let i = 0; i < recs.length; i += 1000) {
    const res = await authB.importUsers(recs.slice(i, i + 1000), {
      hash: { algorithm: 'SCRYPT', key: Buffer.from(h.key, 'base64'), saltSeparator: Buffer.from(h.sep, 'base64'), rounds: h.rounds, memoryCost: h.mem },
    });
    ok += res.successCount;
    res.errors.forEach((e) => console.error(`  compte ${recs[i + e.index].email || recs[i + e.index].uid} : ${e.error.message}`));
  }
  console.log(`Comptes copiés : ${ok} / ${users.length} (mêmes identifiants, mêmes mots de passe)\n`);
}

/* ---------------------------- base Firestore ---------------------------- */
let writes = 0;
async function copyCollection(name) {
  const col = dbA.collection(name);
  const total = (await col.count().get()).data().count;
  if (DRY) { console.log(`  ${name.padEnd(12)} ${total} documents`); return total; }
  if (writes + total > WRITE_MAX) { console.log(`  ${name.padEnd(12)} ${total} documents : SAUTÉE (quota du jour : ${writes} écritures déjà faites). Relance demain avec --only ${name}`); return 0; }
  let last = null, n = 0;
  for (;;) {
    let q = col.orderBy(FieldPath.documentId()).limit(400);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    const batch = dbB.batch();
    for (const d of snap.docs) batch.set(dbB.collection(name).doc(d.id), d.data());
    await batch.commit();
    n += snap.size; writes += snap.size; last = snap.docs[snap.docs.length - 1];
    process.stdout.write(`\r  ${name.padEnd(12)} ${n} / ${total}`);
  }
  process.stdout.write('\n');
  return n;
}

async function migrateDb() {
  let cols = (await dbA.listCollections()).map((c) => c.id);
  if (ONLY.length) cols = cols.filter((c) => ONLY.includes(c));
  cols = cols.filter((c) => !SKIP.includes(c));
  // les joueurs d'abord : c'est le plus important
  cols.sort((a, b) => (a === 'users' ? -1 : b === 'users' ? 1 : a === 'admins' ? -1 : b === 'admins' ? 1 : 0));
  if (!DRY && !flag('force') && !(await dbB.collection('users').limit(1).get()).empty) {
    throw new Error('La nouvelle base contient déjà des joueurs. Ajoute --force pour écrire quand même (les documents de même nom seront remplacés).');
  }
  console.log(`Base Firestore : ${cols.join(', ')}`);
  let n = 0;
  for (const c of cols) n += await copyCollection(c);
  console.log(DRY ? `Total : ${n} documents (${n} écritures nécessaires, ${WRITE_MAX} max par jour en gratuit)` : `Documents copiés : ${n}`);
}

try {
  if (!flag('no-auth')) await migrateAuth();
  if (!flag('no-db')) await migrateDb();
  console.log(DRY ? '\nEssai terminé : relance sans --dry pour copier.' : '\nMigration terminée. Mets à jour js/firebase-config.js avec la configuration du nouveau projet.');
} catch (e) {
  console.error('\nErreur : ' + (e && e.message || e));
  process.exit(1);
}
