const originalFetch = window.fetch;

const statusOverlay = document.getElementById('status');
const statusProgress = document.getElementById('status-progress');
const loadingText = document.getElementById('loading-text');

if (statusOverlay) statusOverlay.style.visibility = 'visible';
if (statusProgress) statusProgress.style.display = 'block';

// Parallel downloader with concurrency limit
async function downloadPartsConcurrently(fileParts, concurrency = 4, onProgress) {
    const buffers = new Array(fileParts.length);
    let nextIndex = 0;
    let completed = 0;

    async function worker() {
        while (nextIndex < fileParts.length) {
            const idx = nextIndex++;
            const partName = fileParts[idx];
            const resp = await fetch(partName, { cache: "force-cache" });
            if (!resp.ok) throw new Error("Missing part: " + partName);
            buffers[idx] = await resp.arrayBuffer();
            completed++;
            if (onProgress) onProgress(completed, fileParts.length);
        }
    }

    const workers = [];
    for (let i = 0; i < Math.min(concurrency, fileParts.length); i++) {
        workers.push(worker());
    }
    await Promise.all(workers);

    const mergedBlob = new Blob(buffers);
    return URL.createObjectURL(mergedBlob);
}

function getParts(file, start, end) {
    let parts = [];
    for (let i = start; i <= end; i++) {
        parts.push(file + ".part" + i);
    }
    return parts;
}

const pckParts = getParts("buckshot-roulette.pck", 1, 17);
const wasmParts = getParts("buckshot-roulette.wasm", 1, 3);
const totalParts = pckParts.length + wasmParts.length;
let totalDownloaded = 0;

function updateDisplay() {
    if (loadingText) {
        let pct = Math.round((totalDownloaded / totalParts) * 100);
        loadingText.innerText = `DOWNLOADING SPEEDBOOST: ${pct}% (${totalDownloaded}/${totalParts})`;
    }
    if (statusProgress) {
        statusProgress.value = totalDownloaded;
        statusProgress.max = totalParts;
    }
}

Promise.all([
    downloadPartsConcurrently(pckParts, 4, () => {
        totalDownloaded++;
        updateDisplay();
    }),
    downloadPartsConcurrently(wasmParts, 2, () => {
        totalDownloaded++;
        updateDisplay();
    })
]).then(([pckUrl, wasmUrl]) => {
    if (loadingText) loadingText.innerText = "LAUNCHING GODOT ENGINE...";
    window.fetch = async function (url, ...args) {
        if (typeof url === 'string' && url.endsWith("buckshot-roulette.pck")) {
            return originalFetch(pckUrl, ...args);
        } else if (typeof url === 'string' && url.endsWith("buckshot-roulette.wasm")) {
            return originalFetch(wasmUrl, ...args);
        } else {
            return originalFetch(url, ...args);
        }
    };
    if (typeof window.godotRunStart === 'function') {
        window.godotRunStart();
    }
}).catch(err => {
    console.error("Failed to load parts:", err);
    if (loadingText) loadingText.innerText = "ERROR: " + err.message;
});
