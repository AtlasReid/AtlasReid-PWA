const NAMESPACE = "atlasreid-pwa";
const TOTAL_FILES = 16;
const appScope = new URL("./", import.meta.url);
const workerURL = new URL("sw.js", appScope);
const listeners = new Set();
const watchedWorkers = new WeakSet();
let registration;
let initialized = false;
let checking;
let status = {
  ready: false, online: navigator.onLine, state: "checking",
  cached: 0, total: TOTAL_FILES, bytes: 0,
  message: "Checking the offline edition…",
};

function publish(patch = {}) {
  status = { ...status, ...patch, online: navigator.onLine };
  for (const listener of listeners) {
    try { listener({ ...status }); } catch (error) { console.error("Offline status callback failed", error); }
  }
  return { ...status };
}

function askWorker(worker, type = "ATLASREID_STATUS") {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error("The offline worker did not respond. Try checking again."));
    }, type === "ATLASREID_REPAIR" ? 90000 : 15000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      const data = event.data;
      if (data?.namespace !== NAMESPACE || data.type !== "ATLASREID_STATUS" || !Number.isFinite(data.cached) || !Number.isFinite(data.total) || !Number.isFinite(data.bytes)) {
        reject(new Error("The offline worker returned an invalid status."));
      } else {
        resolve(data);
      }
    };
    try { worker.postMessage({ namespace: NAMESPACE, type }, [channel.port2]); }
    catch (error) { clearTimeout(timer); channel.port1.close(); reject(error); }
  });
}

async function readActiveStatus({ repair = false } = {}) {
  const worker = registration?.active;
  if (!worker) {
    return publish({ ready: false, state: "installing", message: "Saving every page, image and the 3D model for offline use…" });
  }
  const result = await askWorker(worker, repair ? "ATLASREID_REPAIR" : "ATLASREID_STATUS");
  const ready = result.ready === true && result.cached === result.total && result.total === TOTAL_FILES;
  const updateWaiting = Boolean(registration.waiting);
  return publish({
    ready, cached: result.cached, total: result.total, bytes: result.bytes,
    state: result.error ? "error" : ready ? (updateWaiting ? "update_available" : "ready") : "incomplete",
    message: result.error
      ? `Offline setup failed: ${result.error}. Reconnect and check again.`
      : ready
        ? (updateWaiting ? "An updated offline edition is ready. Use Check offline files to activate it." : "Every page, image and the 3D model is saved for offline use.")
        : `${result.cached} of ${result.total} files are saved. Reconnect and use Check offline files to finish.`,
  });
}

function reportFailure(error) {
  return publish({
    state: "error",
    message: status.ready
      ? `Your saved edition is available. The update failed: ${error.message}`
      : `Offline setup failed: ${error.message}. Check your connection and try again.`,
  });
}

function watchWorker(worker) {
  if (!worker || watchedWorkers.has(worker)) return;
  watchedWorkers.add(worker);
  worker.addEventListener("statechange", () => {
    if (worker.state === "activated") {
      readActiveStatus().catch(reportFailure);
    } else if (worker.state === "installed" && registration?.active) {
      readActiveStatus().catch(reportFailure);
    } else if (worker.state === "redundant" && !registration?.active) {
      if (status.state !== "error") reportFailure(new Error("The files could not all be saved"));
    }
  });
}

async function registerWorker() {
  registration = await navigator.serviceWorker.register(workerURL.href, { scope: appScope.href, updateViaCache: "none" });
  watchWorker(registration.installing);
  watchWorker(registration.waiting);
  registration.addEventListener("updatefound", () => {
    watchWorker(registration.installing);
    publish({ state: "installing", message: status.ready ? "Your saved edition is available while an update downloads…" : "Saving every page, image and the 3D model for offline use…" });
  });
  return registration;
}

/** Start PWA setup. onStatus receives honest, verified cache and connection state. */
export async function initializeOffline({ onStatus } = {}) {
  if (typeof onStatus === "function") listeners.add(onStatus);
  publish();
  if (!window.isSecureContext) {
    return publish({ state: "insecure", ready: false, message: "Offline installation needs HTTPS or localhost. Use an HTTPS address when testing on your phone." });
  }
  if (!("serviceWorker" in navigator)) {
    return publish({ state: "unsupported", ready: false, message: "This browser does not support offline installation." });
  }
  if (initialized) return recheckOffline();
  initialized = true;
  window.addEventListener("online", () => {
    publish({ message: status.ready ? "Online. Your offline portfolio is saved." : "Back online. Use Check offline files to finish saving the portfolio." });
    if (registration?.active) readActiveStatus().catch(reportFailure);
  });
  window.addEventListener("offline", () => publish({
    message: status.ready ? "You are offline. Your saved portfolio and 3D model are available." : "You are offline. Reconnect to finish saving the portfolio.",
  }));
  navigator.serviceWorker.addEventListener("controllerchange", () => readActiveStatus().catch(reportFailure));
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.namespace !== NAMESPACE || event.data.type !== "ATLASREID_PROGRESS" || event.source?.scriptURL !== workerURL.href) return;
    if (event.data.state === "ready") {
      readActiveStatus().catch(reportFailure);
    } else if (event.data.state === "error") {
      publish({ state: "error", message: status.ready ? `Your saved edition is available. ${event.data.message}` : event.data.message });
    } else {
      publish({
        state: "installing",
        cached: status.ready ? status.cached : (event.data.cached ?? status.cached),
        total: event.data.total ?? status.total,
        bytes: status.ready ? status.bytes : (event.data.bytes ?? status.bytes),
        message: status.ready ? "Your saved edition is available while an update downloads…" : event.data.message,
      });
    }
  });
  try {
    publish({ state: "installing", message: "Saving every page, image and the 3D model for offline use…" });
    await registerWorker();
    return await readActiveStatus();
  } catch (error) {
    return reportFailure(error);
  }
}

/** Recount the cache, retry missing files, and activate a waiting update. */
export async function recheckOffline() {
  if (!window.isSecureContext || !("serviceWorker" in navigator)) return { ...status };
  if (checking) return checking;
  checking = (async () => {
    try {
      publish({ state: "checking", message: "Checking saved portfolio files…" });
      if (!registration?.active && !registration?.installing && !registration?.waiting) await registerWorker();
      if (registration?.waiting) {
        watchWorker(registration.waiting);
        registration.waiting.postMessage({ namespace: NAMESPACE, type: "ATLASREID_ACTIVATE" });
        return publish({ state: "installing", message: "Activating the updated offline edition…" });
      }
      const current = await readActiveStatus();
      if (!current.ready && registration?.active && navigator.onLine) {
        publish({ state: "installing", message: "Downloading missing offline files…" });
        return await readActiveStatus({ repair: true });
      }
      return current;
    } catch (error) {
      return reportFailure(error);
    } finally {
      checking = null;
    }
  })();
  return checking;
}
