// IndexedDB-backed patient store. Pseudonymous labels only; the app never asks for a name or DOB.
// Shape: { id, label, age, sex, category, mac, admissionDate, attendingName, hospicePhysician,
//          snapshots: [{ id, general: {...}, dx: {...} }], certs: [{...}], gocNotes: [{...}], updatedAt }
const DB_NAME = 'hospice-workbench';
const STORE = 'patients';
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => { db.close(); resolve(out && 'result' in out ? out.result : out); };
    t.onerror = () => { db.close(); reject(t.error); };
  }));
}
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function newPatient(partial = {}) {
  return {
    id: uid(), label: '', age: '', sex: '', category: 'dementia', mac: 'cgs', admissionDate: '',
    attendingName: '', hospicePhysician: '', snapshots: [], certs: [], gocNotes: [], updatedAt: new Date().toISOString(),
    ...partial,
  };
}
export function newSnapshot(date) {
  return { id: uid(), general: { date: date || new Date().toISOString().slice(0, 10) }, dx: {} };
}
export const sortedSnapshots = (p) => [...(p?.snapshots || [])].sort((a, b) => String(a.general?.date || '').localeCompare(String(b.general?.date || '')));

export async function listPatients() {
  const all = await tx('readonly', (s) => s.getAll());
  return (all || []).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
export async function getPatient(id) { return tx('readonly', (s) => s.get(id)); }
export async function savePatient(p) {
  const rec = { ...p, updatedAt: new Date().toISOString() };
  await tx('readwrite', (s) => s.put(rec));
  return rec;
}
export async function deletePatient(id) { return tx('readwrite', (s) => s.delete(id)); }
export async function exportAll() {
  const patients = await listPatients();
  return JSON.stringify({ app: 'hospice-workbench', version: VERSION, exportedAt: new Date().toISOString(), patients }, null, 2);
}
export async function importAll(json, { replace = false } = {}) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const list = Array.isArray(data) ? data : data.patients;
  if (!Array.isArray(list)) throw new Error('Not a workbench export');
  if (replace) await tx('readwrite', (s) => s.clear());
  for (const p of list) if (p && p.id) await tx('readwrite', (s) => s.put(p));
  return list.length;
}
