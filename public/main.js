const socket = io();
let lobbyId = "default", playerName = "", playerRole = "", machines = {}, players = {}, selfId = null;
let deadBodies = [];

document.getElementById("joinBtn").onclick = () => {
  playerName = document.getElementById("nameInput").value || "Player";
  socket.emit("joinLobby", { lobbyId, name: playerName });
};
document.getElementById("readyBtn").onclick = () => socket.emit("setReady", { lobbyId });
document.getElementById("startBtn").onclick = () => socket.emit("startGame", { lobbyId });

socket.on("lobbyUpdate", (lobby) => {
  const list = document.getElementById("playersList"); list.innerHTML = "";
  let allReady = true;
  lobby.players.forEach(p => {
    const ready = lobby.ready[p.id] ? "✔️" : "❌";
    list.innerHTML += `<div>${p.name} ${ready}</div>`;
    if (!lobby.ready[p.id]) allReady = false;
  });
  document.getElementById("startBtn").style.display = (allReady && lobby.players[0].id === socket.id) ? "block" : "none";
});

socket.on("gameStart", ({ roles, machines: gameMachines }) => {
  document.getElementById("lobby").style.display = "none";
  playerRole = roles[socket.id]; selfId = socket.id; players = roles; machines = gameMachines;
  startPhaserGame();
});

socket.on("playerKilled", ({ targetId }) => {
  addLog(`${targetId} öldürüldü`);
  deadBodies.push(targetId);
});

socket.on("machineRepaired", ({ machineName }) => {
  addLog(`${machineName} tamir edildi`);
  machines[machineName] = "ok";
  updateMachineSprite(machineName);
});

socket.on("machineBroken", ({ machineName }) => {
  addLog(`${machineName} bozuldu`);
  machines[machineName] = "bozuk";
  updateMachineSprite(machineName);
});

socket.on("voteStart", ({ players: alivePlayers }) => showVoteUI(alivePlayers));
socket.on("playerEliminated", ({ targetId }) => addLog(`${targetId} oy ile elendi!`));
socket.on("gameOver", ({ winner }) => addLog(`Oyun bitti! Kazanan: ${winner}`));

function addLog(text) {
  const log = document.getElementById("log");
  const entry = document.createElement("div"); entry.innerText = text;
  log.appendChild(entry); setTimeout(() => entry.remove(), 10000);
}

function startPhaserGame() {
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: { default: "arcade", arcade: { debug: false } },
    scene: { preload, create, update }
  };
  const game = new Phaser.Game(config);

  let playerCircle, playerSprites = {}, machineSprites = {}, nameTexts = {}, joystick = { x: 0, y: 0, pointer: null };
  let machineNames = Object.keys(machines);
  const playerSpeed = 150;
  const deadSprites = {};

  function preload() {}

  function create() {
    const self = this;

    // World sınırları
    this.physics.world.setBounds(0, 0, 2000, 2000);

    // Kendin
    playerCircle = this.add.circle(400, 300, 20, 0x00ff00).setDepth(1);
    playerCircle.setPosition(400, 300);
    this.cameras.main.startFollow(playerCircle, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 2000, 2000);

    // Kendin üstüne isim
    const selfNameText = this.add.text(playerCircle.x, playerCircle.y - 30, playerName, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);

    // Diğer oyuncular
    for (const id in players) {
      if (id !== selfId) {
        const x = Phaser.Math.Between(100, 700);
        const y = Phaser.Math.Between(100, 500);
        const circle = this.add.circle(x, y, 20, 0x00ff00);
        playerSprites[id] = circle;
        const nameText = this.add.text(x, y - 30, id, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
        nameTexts[id] = nameText;
      }
    }

    // Makineler
    machineNames.forEach(name => {
      const x = Phaser.Math.Between(100, 700);
      const y = Phaser.Math.Between(100, 500);
      const color = machines[name] === "ok" ? 0x00ff00 : 0xff0000;
      const m = this.add.rectangle(x, y, 40, 40, color);
      m.name = name;
      machineSprites[name] = m;
      const text = this.add.text(x, y - 30, name, { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
      m.nameText = text;
    });

    // Joystick
    this.input.on("pointerdown", pointer => { joystick.pointer = pointer; joystick.x = pointer.x; joystick.y = pointer.y; });
    this.input.on("pointerup", pointer => { joystick.pointer = null; });
    this.input.on("pointermove", pointer => { if (joystick.pointer && pointer.id === joystick.pointer.id) { joystick.x = pointer.x; joystick.y = pointer.y; } });

    // Öldür / tamir butonları (yakınlık ile gösterilecek)
    this.killBtn = this.add.text(50, window.innerHeight - 100, "Öldür", { backgroundColor: "#ff0000", padding: { x: 10, y: 5 } }).setInteractive().setVisible(false);
    this.repairBtn = this.add.text(150, window.innerHeight - 100, "Tamir Et", { backgroundColor: "#0000ff", padding: { x: 10, y: 5 } }).setInteractive().setVisible(false);

    this.killBtn.on("pointerdown", () => {
      for (const id in playerSprites) {
        const p = playerSprites[id];
        const dist = Phaser.Math.Distance.Between(playerCircle.x, playerCircle.y, p.x, p.y);
        if (dist < 50) {
          socket.emit("killPlayer", { lobbyId, targetId: id });
          addLog(`${id} öldürüldü!`);
        }
      }
    });

    this.repairBtn.on("pointerdown", () => {
      for (const name in machineSprites) {
        const m = machineSprites[name];
        const dist = Phaser.Math.Distance.Between(playerCircle.x, playerCircle.y, m.x, m.y);
        if (dist < 50 && machines[name] === "bozuk") {
          socket.emit("repairMachine", { lobbyId, machineName: name });
          machines[name] = "ok"; m.fillColor = 0x00ff00;
        }
      }
    });

    // Mini harita
    this.minimap = this.add.graphics();
  }

  function updateMachineSprite(name) {
    const m = machineSprites[name]; if (!m) return;
    m.fillColor = machines[name] === "ok" ? 0x00ff00 : 0xff0000;
  }

  function showVoteUI(alivePlayers) {
    const container = document.createElement("div"); container.style.position = "absolute";
    container.style.top = "50%"; container.style.left = "50%"; container.style.transform = "translate(-50%,-50%)";
    container.style.background = "rgba(0,0,0,0.7)"; container.style.padding = "20px"; container.id = "voteUI";
    alivePlayers.forEach(p => {
      const btn = document.createElement("button"); btn.innerText = p.name; btn.style.margin = "5px";
      btn.onclick = () => { socket.emit("vote", { lobbyId, targetId: p.id }); document.body.removeChild(container); };
      container.appendChild(btn);
    });
    document.body.appendChild(container);
    addLog("Oylama başladı! 20 saniye içinde oy verin.");
  }

  function update() {
    // Hareket
    let vx = 0, vy = 0;
    if (joystick.pointer) { vx = joystick.x - playerCircle.x; vy = joystick.y - playerCircle.y;
      const len = Math.sqrt(vx*vx + vy*vy); if (len > 0) { vx = (vx/len)*playerSpeed; vy = (vy/len)*playerSpeed; } }
    playerCircle.x += vx * (1/60); playerCircle.y += vy * (1/60);

    // Sınırlar
    playerCircle.x = Phaser.Math.Clamp(playerCircle.x, 20, 1980);
    playerCircle.y = Phaser.Math.Clamp(playerCircle.y, 20, 1980);

    // Kendin üstüne isim
    // Kendin için text yoksa oluştur
    if (this.selfNameText) { this.selfNameText.setPosition(playerCircle.x, playerCircle.y - 30); }
    else { this.selfNameText = this.add.text(playerCircle.x, playerCircle.y - 30, playerName, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5); }

    // Diğer oyuncular ve isimler
    for (const id in playerSprites) {
      const p = playerSprites[id];
      const t = nameTexts[id];
      t.setPosition(p.x, p.y - 30);
    }

    // Makineler ve isimler
    machineNames.forEach(name => {
      const m = machineSprites[name];
      m.nameText.setPosition(m.x, m.y - 30);
    });

    // Butonların görünürlüğü (yakınlık)
    let killVisible = false, repairVisible = false;
    for (const id in playerSprites) {
      const p = playerSprites[id];
      const dist = Phaser.Math.Distance.Between(playerCircle.x, playerCircle.y, p.x, p.y);
      if (dist < 50) killVisible = true;
    }
    for (const name in machineSprites) {
      const m = machineSprites[name];
      const dist = Phaser.Math.Distance.Between(playerCircle.x, playerCircle.y, m.x, m.y);
      if (dist < 50 && machines[name] === "bozuk") repairVisible = true;
    }
    this.killBtn.setVisible(killVisible);
    this.repairBtn.setVisible(repairVisible);

    // Mini harita
    const mm = this.minimap;
    mm.clear();
    mm.fillStyle(0x000000, 0.3); mm.fillRect(window.innerWidth - 150, 10, 140, 140);
    mm.fillStyle(0x00ff00, 1); // oyuncular
    for (const id in playerSprites) {
      const p = playerSprites[id];
      mm.fillRect(window.innerWidth - 150 + p.x * 0.07, 10 + p.y * 0.07, 5, 5);
    }
    mm.fillStyle(0xffff00, 1); mm.fillRect(window.innerWidth - 150 + playerCircle.x * 0.07, 10 + playerCircle.y * 0.07, 5, 5);
    // Makineler
    machineNames.forEach(name => {
      const m = machineSprites[name];
      const color = machines[name] === "ok" ? 0x00ff00 : 0xff0000;
      mm.fillStyle(color, 1);
      mm.fillRect(window.innerWidth - 150 + m.x * 0.07, 10 + m.y * 0.07, 5, 5);
    });

    // Ceset kontrolü
    deadBodies.forEach(id => {
      const p = playerSprites[id] || playerCircle; // placeholder
      const dist = Phaser.Math.Distance.Between(playerCircle.x, playerCircle.y, p.x, p.y);
      if (dist < 50) {
        if (!document.getElementById("voteBtn")) {
          const btn = document.createElement("button"); btn.innerText = "Toplantı Başlat"; btn.id = "voteBtn";
          btn.style.position = "absolute"; btn.style.bottom = "200px"; btn.style.left = "50%"; btn.style.transform = "translateX(-50%)";
          btn.onclick = () => { socket.emit("startVote", { lobbyId }); document.body.removeChild(btn); };
          document.body.appendChild(btn);
        }
      }
    });
  }
}