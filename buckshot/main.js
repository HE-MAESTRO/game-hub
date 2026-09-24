function loadPckFromCdn() {
    const totalParts = 17;
    const baseUrl = 'https://raw.githubusercontent.com/genizy/web-port/main/buckshot-roulette/buckshot-roulette.pck.part';
    const urls = [];
    for (let i = 1; i <= totalParts; i++) {
        urls.push(`${baseUrl}${i}`);
    }

    const statusProgress = document.getElementById("status-progress-inner");
    const statusNotice = document.getElementById("status-notice");
    let loadedCount = 0;

    function updateProgress() {
        const percent = Math.round((loadedCount / totalParts) * 100);
        if (statusProgress) statusProgress.style.width = percent + "%";
        if (statusNotice) {
            statusNotice.innerText = `INITIALIZING CRITICAL ASSETS: ${percent}% (${loadedCount}/${totalParts})`;
            statusNotice.style.display = "block";
        }
    }

    // Download in parallel pool of 4 chunks
    const concurrency = 4;
    let index = 0;
    const results = new Array(totalParts);

    function downloadNext() {
        if (index >= totalParts) return Promise.resolve();
        const currentIndex = index++;
        return fetch(urls[currentIndex])
            .then(res => {
                if (!res.ok) throw new Error("Fetch failed " + urls[currentIndex]);
                return res.arrayBuffer();
            })
            .then(buf => {
                results[currentIndex] = buf;
                loadedCount++;
                updateProgress();
                return downloadNext();
            });
    }

    const workers = [];
    for (let i = 0; i < concurrency; i++) {
        workers.push(downloadNext());
    }

    return Promise.all(workers).then(() => {
        return new Blob(results);
    });
}

const engine = new Engine(GODOT_CONFIG);

(function () {
    const INDETERMINATE_STATUS_STEP_MS = 100;
    const statusProgress = document.getElementById("status-progress");
    const statusProgressInner = document.getElementById("status-progress-inner");
    const statusIndeterminate = document.getElementById("status-indeterminate");
    const statusNotice = document.getElementById("status-notice");
    let initializing = true;
    let statusMode = "hidden";

    let animationCallbacks = [];
    function animate(time) {
        animationCallbacks.forEach((callback) => callback(time));
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    function setStatusMode(mode) {
        if (statusMode === mode || !initializing) return;
        [statusProgress, statusIndeterminate, statusNotice].forEach((elem) => {
            if (elem) elem.style.display = "none";
        });
        animationCallbacks = animationCallbacks.filter(function (value) {
            return value != animateStatusIndeterminate;
        });
        switch (mode) {
            case "progress":
                if (statusProgress) statusProgress.style.display = "block";
                break;
            case "indeterminate":
                if (statusIndeterminate) statusIndeterminate.style.display = "block";
                animationCallbacks.push(animateStatusIndeterminate);
                break;
            case "notice":
                if (statusNotice) statusNotice.style.display = "block";
                break;
            case "hidden":
                break;
            default:
                throw new Error("Invalid status mode");
        }
        statusMode = mode;
    }

    function animateStatusIndeterminate(ms) {
        let i = Math.floor((ms / INDETERMINATE_STATUS_STEP_MS) % 8);
        if (statusIndeterminate.children[i].style.borderTopColor == "") {
            Array.prototype.forEach.call(statusIndeterminate.children, (child) => {
                child.style.borderTopColor = "";
            });
            statusIndeterminate.children[i].style.borderTopColor = "#dfdfdf";
        }
    }

    function setStatusNotice(text) {
        while (statusNotice.lastChild) {
            statusNotice.removeChild(statusNotice.lastChild);
        }
        let lines = text.split("\n");
        lines.forEach((line) => {
            statusNotice.appendChild(document.createTextNode(line));
            statusNotice.appendChild(document.createElement("br"));
        });
    }

    function displayFailureNotice(err) {
        let msg = err.message || err;
        console.error(err);
        setStatusNotice(msg);
        setStatusMode("notice");
        initializing = false;
    }

    const missing = Engine.getMissingFeatures();
    if (missing.length !== 0) {
        const missingMsg = "Error\nThe following features required to run Godot projects on the Web are missing:\n";
        displayFailureNotice(missingMsg + missing.join("\n"));
    } else {
        setStatusMode("progress");
        loadPckFromCdn().then(pckBlob => {
            setStatusMode("indeterminate");
            engine.startGame({
                'onProgress': function (current, total) {
                    if (total > 0) {
                        statusProgressInner.style.width = (current / total) * 100 + "%";
                        setStatusMode("progress");
                        if (current === total) {
                            setStatusMode("indeterminate");
                        }
                    } else {
                        setStatusMode("indeterminate");
                    }
                },
                'pck': pckBlob
            }).then(() => {
                setStatusMode("hidden");
                initializing = false;
            }, displayFailureNotice);
        }).catch(displayFailureNotice);
    }
})();
