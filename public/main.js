const socket = io();

let lobbyId = "default";
let playerName = "";
let playerRole = "";
let machines = {};
let players = {};
let selfId = null;

document.getElementById("joinBtn").onclick = () => {
  playerName = document.getElementById("nameInput").value || "Player";
  socket.emit("joinLobby", { lobbyId, name: playerName });
};

document.getElementById("readyBtn").onclick = () => {
  socket.emit("setReady", { lobbyId });
};

document.getElementById("startBtn").onclick = () => {
  socket.emit("startGame", { lobbyId });
};

socket.on("lobbyUpdate", (lobby) => {
  const list = document.getElementById("playersList");
  list.innerHTML = "";
  let allReady = true;
  lobby.players.forEach(p => {
    const ready = lobby.ready[p.id] ? "✔️" : "❌";
    list.innerHTML += `<div>${p.name} ${ready}</div>`;
    if (!lobby.ready[p.id]) allReady = false;
  });
  // Start button only for first player
  document.getElementById("startBtn").style.display = (allReady && lobby.players[0].id === socket.id) ? "block" : "none";
});

socket.on("gameStart", ({ roles, machines: gameMachines }) => {
  document.getElementById("lobby").style.display = "none";
  playerRole = roles[socket.id];
  selfId = socket.id;
  players = roles;
  machines = gameMachines;
  startPhaserGame();
});

socket.on("playerKilled", ({ targetId }) => {
  addLog(`${targetId} öldürüldü`);
  if (players[targetId]) players[targetId].alive = false;
});

socket.on("machineRepaired", ({ machineName }) => {
  addLog(`${machineName} tamir edildi`);
  machines[machineName] = "ok";
});

function addLog(text) {
  const log = document.getElementById("log");
  const entry = document.createElement("div");
  entry.innerText = text;
  log.appendChild(entry);
  setTimeout(() => entry.remove(), 10000);
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

  let playerCircle;
  const playerSpeed = 150;
  let cursors;
  let joystick = { x: 0, y: 0, pointer: null };

  const playerSprites = {};
  const machineSprites = {};
  const machineNames = Object.keys(machines);

  function preload() {}

  function create() {
    // Kendin
    playerCircle = this.add.circle(400, 300, 20, 0x00ff00);
    playerCircle.setDepth(1);

    // Diğer oyuncular
    for (const id in players) {
      if (id !== selfId) {
        const circle = this.add.circle(Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 500), 20, 0x00ff00);
        playerSprites[id] = circle;
      }
    }

    // Makineler sahnede
    machineNames.forEach(name => {
      const x = Phaser.Math.Between(100, 700);
      const y = Phaser.Math.Between(100, 500);
      const color = machines[name] === "ok" ? 0x00ff00 : 0xff0000;
      const m = this.add.rectangle(x, y, 40, 40, color);
      m.name = name;
      machineSprites[name] = m;
    });

    // Joystick
    this.input.on("pointerdown", pointer => {
      joystick.pointer = pointer;
      joystick.x = pointer.x;
      joystick.y = pointer.y;
    });
    this.input.on("pointerup", pointer => { joystick.pointer = null; });
    this.input.on("pointermove", pointer => {
      if (joystick.pointer && pointer.id === joystick.pointer.id) {
        joystick.x = pointer.x;
        joystick.y = pointer.y;
      }
    });

    // Öldür / tamir butonları
    this.killBtn = this.add.text(50, window.innerHeight - 100, "Öldür", { backgroundColor: "#ff0000", padding: {x:10,y:5} }).setInteractive();
    this.repairBtn = this.add.text(150, window.innerHeight - 100, "Tamir Et", { backgroundColor: "#0000ff", padding: {x:10,y:5} }).setInteractive();

    this.killBtn.on("pointerdown", () => {
      // Yakındaki oyuncuyu öldür
      for (const id in playerSprites) {
        const dist = Phaser.Math.Distance.Between(playerCircle.x, playerCircle.y, playerSprites[id].x, playerSprites[id].y);
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
          machines[name] = "ok";
          m.fillColor = 0x00ff00;
        }
      }
    });

    // Mini harita
    this.minimap = this.add.graphics();
  }

  function update() {
    let vx = 0, vy = 0;
    if (joystick.pointer) {
      vx = joystick.x - playerCircle.x;
      vy = joystick.y - playerCircle.y;
      const len = Math.sqrt(vx*vx + vy*vy);
      if (len > 0) { vx = (vx/len)*playerSpeed; vy = (vy/len)*playerSpeed; }
    }
    playerCircle.x += vx * (1/60);
    playerCircle.y += vy * (1/60);

    // Mini harita güncelle
    const mm = this.minimap;
    mm.clear();
    mm.fillStyle(0x000000, 0.3);
    mm.fillRect(window.innerWidth - 150, 10, 140, 140);
    const scale = 0.1;
    // Oyuncular
    mm.fillStyle(0x00ff00, 1);
    for (const id in playerSprites) {
      const p = playerSprites[id];
      mm.fillRect(window.innerWidth - 150 + p.x*scale, 10 + p.y*scale, 5,5);
    }
    // Kendin
    mm.fillStyle(0xffff00,1);
    mm.fillRect(window.innerWidth - 150 + playerCircle.x*scale, 10 + playerCircle.y*scale,5,5);
    // Makineler
    machineNames.forEach(name => {
      const m = machineSprites[name];
      const color = machines[name] === "ok" ? 0x00ff00 : 0xff0000;
      mm.fillStyle(color,1);
      mm.fillRect(window.innerWidth - 150 + m.x*scale, 10 + m.y*scale,5,5);
    });
  }
}