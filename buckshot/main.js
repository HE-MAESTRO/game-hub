// Buckshot Roulette Loader & Streamlined Part Merger
const originalFetch = window.fetch;

const statusNotice = document.getElementById("status-notice");
const statusProgress = document.getElementById("status-progress");
const loadingText = document.getElementById("loading-text");

function setStatus(msg) {
    if (loadingText) loadingText.innerText = msg;
    if (statusNotice) {
        statusNotice.style.display = "block";
        statusNotice.innerText = msg;
    }
}

// Download parts concurrently with pool
async function fetchParts(urls, onProgress) {
    const total = urls.length;
    let completed = 0;
    const results = new Array(total);
    const concurrency = 4;
    let nextIdx = 0;

    async function worker() {
        while (nextIdx < total) {
            const idx = nextIdx++;
            const url = urls[idx];
            const resp = await fetch(url, { cache: "force-cache" });
            if (!resp.ok) throw new Error("Failed loading " + url + " (" + resp.status + ")");
            results[idx] = await resp.arrayBuffer();
            completed++;
            if (onProgress) onProgress(completed, total);
        }
    }

    const workers = [];
    for (let i = 0; i < Math.min(concurrency, total); i++) {
        workers.push(worker());
    }
    await Promise.all(workers);
    return new Blob(results);
}

(async function init() {
    try {
        setStatus("ЗАГРУЗКА БИБЛИОТЕК GODOT...");

        // 1. WASM parts (local relative paths)
        const wasmUrls = [
            "./buckshot-roulette.wasm.part1",
            "./buckshot-roulette.wasm.part2",
            "./buckshot-roulette.wasm.part3"
        ];

        // 2. PCK parts from fast GitHub raw CDN
        const pckUrls = [];
        for (let i = 1; i <= 17; i++) {
            pckUrls.push(`https://raw.githubusercontent.com/genizy/web-port/main/buckshot-roulette/buckshot-roulette.pck.part${i}`);
        }

        let wasmDone = 0;
        let pckDone = 0;
        const totalAll = wasmUrls.length + pckUrls.length;

        function updateProgress() {
            const done = wasmDone + pckDone;
            const pct = Math.round((done / totalAll) * 100);
            setStatus(`ЗАГРУЗКА РЕСУРСОВ: ${pct}% (${done}/${totalAll})`);
            if (statusProgress) {
                statusProgress.value = done;
                statusProgress.max = totalAll;
                statusProgress.style.display = "block";
            }
        }

        const [wasmBlob, pckBlob] = await Promise.all([
            fetchParts(wasmUrls, (done) => {
                wasmDone = done;
                updateProgress();
            }),
            fetchParts(pckUrls, (done) => {
                pckDone = done;
                updateProgress();
            })
        ]);

        const wasmUrl = URL.createObjectURL(wasmBlob);
        const pckUrl = URL.createObjectURL(pckBlob);

        setStatus("ИНИЦИАЛИЗАЦИЯ ДВИЖКА GODOT...");

        window.fetch = async function(url, ...args) {
            const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
            if (urlStr.includes("buckshot-roulette.wasm")) {
                return originalFetch(wasmUrl, ...args);
            }
            if (urlStr.includes("buckshot-roulette.pck")) {
                return originalFetch(pckUrl, ...args);
            }
            return originalFetch(url, ...args);
        };

        if (typeof window.godotRunStart === 'function') {
            window.godotRunStart();
            if (loadingText) loadingText.style.display = "none";
        } else {
            console.error("godotRunStart not ready");
        }
    } catch (err) {
        console.error("Init failed:", err);
        setStatus("ОШИБКА ЗАГРУЗКИ: " + (err.message || err));
    }
})();
