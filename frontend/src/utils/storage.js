/* Storage helpers.
 *
 * Reading `localStorage` THROWS a SecurityError when storage is blocked
 * (Safari "Block all cookies", third-party iframe, some webviews). That read
 * used to sit inside useState initialisers, so the throw happened during the
 * first render and the whole app failed to mount. Every access goes through
 * here: a blocked store degrades to in-memory defaults instead of a white page. */

const memory = new Map();

const isStorageBlocked = (() => {
  try {
    const probe = '__najdda_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return false;
  } catch {
    return true;
  }
})();

export function readStore(key, fallback = null) {
  if (isStorageBlocked) return memory.has(key) ? memory.get(key) : fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  memory.set(key, value);
  if (isStorageBlocked) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota exceeded or blocked — the in-memory copy still serves this session */
  }
}

export function removeStore(key) {
  memory.delete(key);
  if (isStorageBlocked) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
