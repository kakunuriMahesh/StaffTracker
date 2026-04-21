const listeners = new Set();

export function addStaffReloadListener(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function triggerStaffReload() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.log('[StaffReload] Error:', e.message);
    }
  });
}