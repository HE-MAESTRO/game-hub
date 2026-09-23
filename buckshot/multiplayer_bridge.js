// WebSocket Multiplayer Bridge for Buckshot Roulette
(function() {
    const WS_URL = "wss://conventions-cabinets-received-hostel.trycloudflare.com";
    let ws = null;
    let currentRoom = null;
    let isHost = false;

    const statusEl = document.getElementById("room-status");
    const btnCreate = document.getElementById("btn-create-room");
    const btnJoin = document.getElementById("btn-join-room");
    const inputCode = document.getElementById("input-room-code");

    function connectWS(onOpen) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            onOpen();
            return;
        }
        statusEl.innerText = "Подключение к серверу...";
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            statusEl.innerText = "Соединение установлено";
            onOpen();
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            handleMessage(msg);
        };

        ws.onclose = () => {
            statusEl.innerText = "Отключено от комнат";
        };

        ws.onerror = (e) => {
            statusEl.innerText = "Ошибка соединения WS";
        };
    }

    function handleMessage(msg) {
        switch(msg.type) {
            case "created":
                currentRoom = msg.code;
                isHost = true;
                statusEl.innerHTML = `<b style="color:#00ffcc">Комната: ${msg.code}</b><br>Ждем второго игрока...`;
                inputCode.value = msg.code;
                break;
            case "joined":
                currentRoom = msg.code;
                isHost = false;
                statusEl.innerHTML = `<b style="color:#00ffcc">В комнате: ${msg.code}</b><br>Игра начинается!`;
                break;
            case "player_joined":
                statusEl.innerHTML = `<b style="color:#00ffcc">Игрок подключился!</b><br>Комната ${currentRoom}`;
                break;
            case "action":
                console.log("[Multiplayer Sync]", msg.data);
                window.dispatchEvent(new CustomEvent("godot_multiplayer_action", { detail: msg.data }));
                break;
            case "player_left":
                statusEl.innerText = "Игрок отключился";
                break;
            case "error":
                statusEl.innerText = "Ошибка: " + msg.message;
                break;
        }
    }

    if (btnCreate) {
        btnCreate.onclick = () => {
            connectWS(() => {
                ws.send(JSON.stringify({ type: "create" }));
            });
        };
    }

    if (btnJoin) {
        btnJoin.onclick = () => {
            const code = inputCode.value.trim();
            if (!code || code.length !== 4) {
                statusEl.innerText = "Введите 4-значный код!";
                return;
            }
            connectWS(() => {
                ws.send(JSON.stringify({ type: "join", code: code }));
            });
        };
    }

    window.sendGodotAction = function(actionData) {
        if (ws && ws.readyState === WebSocket.OPEN && currentRoom) {
            ws.send(JSON.stringify({ type: "action", data: actionData }));
        }
    };
})();
