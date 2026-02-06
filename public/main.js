const socket = io();

let lobbyId = "default";
let playerName = "";

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

socket.on("gameStart", ({ roles, machines }) => {
  document.getElementById("lobby").style.display = "none";
  startPhaserGame(roles[socket.id], machines);
});

function startPhaserGame(role, machines) {
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };
  const game = new Phaser.Game(config);

  function preload() {}
  function create() {
    addLog(`Rolünüz: ${role}`);
    // TODO: Joystick, mini harita, makineler, hareket, öldür/tamir butonları
  }
  function update() {}
}

function addLog(text) {
  const log = document.getElementById("log");
  const entry = document.createElement("div");
  entry.innerText = text;
  log.appendChild(entry);
  setTimeout(() => entry.remove(), 10000);
}