/* ============================================================
   Local storage shim — replaces Claude's window.storage API
   with an identical interface.

   Durability: every value is written to BOTH IndexedDB and
   localStorage, and reads fall back from one to the other. Some
   browsers (notably Safari web apps) evict IndexedDB between
   launches; keeping a second independent copy means the data
   survives as long as either store does. Everything stays on this
   device — no network call involved.
   ============================================================ */
(function(){
  const DB_NAME = 'money-hq-db';
  const STORE_NAME = 'kv';
  const LS_PREFIX = 'mhq:';
  let dbPromise = null;

  function openDB(){
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)){
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function lsGet(key){ try { return localStorage.getItem(LS_PREFIX + key); } catch(e){ return null; } }
  function lsSet(key, value){ try { localStorage.setItem(LS_PREFIX + key, value); } catch(e){} }
  function lsDel(key){ try { localStorage.removeItem(LS_PREFIX + key); } catch(e){} }

  async function idbGet(key){
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
      });
    } catch(e){ return null; }
  }

  async function idbSet(key, value){
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put({ key, value });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch(e){}
  }

  async function get(key){
    // Prefer IndexedDB; fall back to localStorage. If only one store has
    // the value, repopulate the other so both carry it going forward.
    const idbVal = await idbGet(key);
    if (idbVal != null){
      if (lsGet(key) == null) lsSet(key, idbVal);
      return { key, value: idbVal };
    }
    const lsVal = lsGet(key);
    if (lsVal != null){
      idbSet(key, lsVal);
      return { key, value: lsVal };
    }
    return null;
  }

  async function set(key, value){
    lsSet(key, value);        // synchronous, durable copy first
    await idbSet(key, value);
    return { key, value };
  }

  async function del(key){
    lsDel(key);
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch(e){}
    return { key, deleted: true };
  }

  async function getAll(){
    const rows = [];
    const seen = new Set();
    try {
      const db = await openDB();
      const idbRows = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      idbRows.forEach(r => { rows.push(r); seen.add(r.key); });
    } catch(e){}
    try {
      for (let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if (k && k.startsWith(LS_PREFIX)){
          const realKey = k.slice(LS_PREFIX.length);
          if (!seen.has(realKey)){
            rows.push({ key: realKey, value: localStorage.getItem(k) });
            seen.add(realKey);
          }
        }
      }
    } catch(e){}
    return rows;
  }

  async function list(prefix){
    const all = await getAll();
    let keys = all.map(r => r.key);
    if (prefix) keys = keys.filter(k => k.startsWith(prefix));
    return { keys, prefix };
  }

  // Exposed for the backup/restore UI
  window.storage = { get, set, delete: del, list, _getAll: getAll };

  // ---- Backup / restore, for real data safety ----
  window.moneyHqBackup = {
    async exportAll(){
      const all = await getAll();
      const payload = { exportedAt: new Date().toISOString(), data: all };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0,10);
      a.href = url;
      a.download = `money-hq-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return payload.data.length;
    },
    async importAll(file){
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : parsed.data;
      if (!Array.isArray(rows)) throw new Error('Unrecognized backup file format');
      for (const r of rows){ await set(r.key, r.value); }
      return rows.length;
    }
  };
})();
