/* ============================================================
   Local storage shim — replaces Claude's window.storage API
   with an identical interface backed by IndexedDB.
   Everything lives on this device, no network call involved.
   ============================================================ */
(function(){
  const DB_NAME = 'money-hq-db';
  const STORE_NAME = 'kv';
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

  async function get(key){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ? { key, value: req.result.value } : null);
      req.onerror = () => reject(req.error);
    });
  }

  async function set(key, value){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put({ key, value });
      req.onsuccess = () => resolve({ key, value });
      req.onerror = () => reject(req.error);
    });
  }

  async function del(key){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(key);
      req.onsuccess = () => resolve({ key, deleted: true });
      req.onerror = () => reject(req.error);
    });
  }

  async function list(prefix){
    const all = await getAll();
    let keys = all.map(r => r.key);
    if (prefix) keys = keys.filter(k => k.startsWith(prefix));
    return { keys, prefix };
  }

  async function getAll(){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
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
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        rows.forEach(r => store.put(r));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return rows.length;
    }
  };
})();
