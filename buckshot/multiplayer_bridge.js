// Multiplayer Bridge & Native Menu Injector
(function() {
    let ws = null;
    let roomCode = null;
    let isHost = false;

    window.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('game-terminal-modal');
        const btnCreate = document.getElementById('btn-create-room');
        const btnJoin = document.getElementById('btn-join-room');
        const inputCode = document.getElementById('input-room-code');
        const statusEl = document.getElementById('room-status');
        const btnClose = document.getElementById('btn-close-modal');

        if (btnClose) btnClose.onclick = () => { modal.style.display = 'none'; };

        // Keyboard shortcut or hook to open multiplayer terminal
        window.openMultiplayerModal = function() {
            modal.style.display = 'block';
        };

        // Inject Native-looking HUD button into bottom left
        const hudBtn = document.createElement('div');
        hudBtn.id = 'hud-mp-btn';
        hudBtn.innerHTML = '⚡ [ MULTIPLAYER PROTOCOL ]';
        hudBtn.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:9999;font-family:monospace;font-size:12px;color:#ff2a4b;border:1px solid #ff2a4b;background:rgba(10,12,16,0.85);padding:8px 14px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;box-shadow:0 0 10px rgba(255,42,75,0.3);';
        hudBtn.onmouseover = () => { hudBtn.style.background = '#ff2a4b'; hudBtn.style.color = '#000'; };
        hudBtn.onmouseout = () => { hudBtn.style.background = 'rgba(10,12,16,0.85)'; hudBtn.style.color = '#ff2a4b'; };
        hudBtn.onclick = () => { modal.style.display = 'block'; };
        document.body.appendChild(hudBtn);

        function connectWS() {
            if (ws && ws.readyState === WebSocket.OPEN) return;
            const wsUrl = 'wss://conventions-cabinets-received-hostel.trycloudflare.com';
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                statusEl.innerText = 'ПОДКЛЮЧЕНО К СЕТЕВОМУ ШЛЮЗУ';
                statusEl.style.color = '#00ff66';
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    handleServerMessage(msg);
                } catch(e) { console.error(e); }
            };

            ws.onclose = () => {
                statusEl.innerText = 'СОЕДИНЕНИЕ ЗАКРЫТО. ПОВТОР...';
                statusEl.style.color = '#ff4444';
                setTimeout(connectWS, 2000);
            };
        }

        connectWS();

        btnCreate.onclick = () => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({ type: 'create' }));
            statusEl.innerText = 'ГЕНЕРАЦИЯ ЧАСТОТЫ КОМНАТЫ...';
        };

        btnJoin.onclick = () => {
            const code = inputCode.value.trim().toUpperCase();
            if (code.length !== 4) {
                statusEl.innerText = 'ОШИБКА: КОД ДОЛЖЕН БЫТЬ 4 ЗНАКА';
                statusEl.style.color = '#ff4444';
                return;
            }
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({ type: 'join', code: code }));
            statusEl.innerText = 'ПОДКЛЮЧЕНИЕ К ЧАСТОТЕ ' + code + '...';
        };

        function handleServerMessage(msg) {
            switch(msg.type) {
                case 'created':
                    roomCode = msg.code;
                    isHost = true;
                    statusEl.innerText = 'ЧАСТОТА: [' + roomCode + '] — ОЖИДАНИЕ ВТОРОГО ИГРОКА...';
                    statusEl.style.color = '#ffaa00';
                    break;
                case 'start':
                    statusEl.innerText = 'КАНАЛ СВЯЗИ УСТАНОВЛЕН! МАТЧ 1 НА 1';
                    statusEl.style.color = '#00ff66';
                    setTimeout(() => { modal.style.display = 'none'; }, 1500);
                    break;
                case 'action':
                    console.log('Opponent action received:', msg.data);
                    break;
                case 'error':
                    statusEl.innerText = 'ОШИБКА: ' + msg.message;
                    statusEl.style.color = '#ff4444';
                    break;
            }
        }
    });
})();
