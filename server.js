const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// LOBBY & OYUNCU VERİLERİ
const lobby = {
  players: [],
  machines: [
    { name: "Fette 1200", x: 200, y: 200 },
    { name: "Fette 2200", x: 600, y: 200 },
    { name: "Kilian KTP 720", x: 1000, y: 200 },
    { name: "Korsch XL 400", x: 1400, y: 200 },
    { name: "Bosch GKF 701", x: 1800, y: 200 },
    { name: "Fette 3200", x: 200, y: 800 },
    { name: "Korsch XT600", x: 600, y: 800 },
    { name: "Fette Fe55", x: 1000, y: 800 },
    { name: "Sejong", x: 1400, y: 800 },
    { name: "Fette 2100", x: 1800, y: 800 },
  ],
  started: false,
  sabotage: null,
  time: 300
};

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

io.on("connection", socket => {
  console.log("🔌 Bağlanan:", socket.id);

  // LOBBİYE KATIL
  socket.on("joinLobby", ({ name }, callback) => {
    if (!name) return callback?.({ error: "İsim girin!" });

    let player = { 
      id: socket.id, 
      name, 
      x: 400 + Math.random() * 400, 
      y: 400 + Math.random() * 400, 
      color: `hsl(${Math.random()*360},70%,50%)`, 
      ready: false 
    };

    lobby.players.push(player);

    // Tüm client’lara güncel lobby bilgisini gönder
    const payload = {
      players: lobby.players.map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        color: p.color,
        ready: p.ready
      })),
      machines: lobby.machines
    };

    io.emit("lobbyUpdate", payload);
    callback?.({ success: true, machines: lobby.machines });
  });

  // HAZIR DURUMU
  socket.on("playerReady", () => {
    let p = lobby.players.find(pl => pl.id === socket.id);
    if (p) p.ready = true;

    // Lobby güncellemesini tüm client’lara gönder
    const payload = {
      players: lobby.players.map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        color: p.color,
        ready: p.ready
      })),
      machines: lobby.machines
    };
    io.emit("lobbyUpdate", payload);

    // Oyun başlat
    if (lobby.players.every(pl => pl.ready) && !lobby.started) {
      lobby.started = true;
      io.emit("gameStart", payload);
      startGameLoop();
    }
  });

  // HAREKET
  socket.on("move", ({ x, y }) => {
    let p = lobby.players.find(pl => pl.id === socket.id);
    if (p) { p.x = x; p.y = y; }
  });

  // SABOTAJ
  socket.on("sabotage", () => {
    lobby.sabotage = "Makine arızası!";
    setTimeout(()=>{ lobby.sabotage = null; }, 5000);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    lobby.players = lobby.players.filter(pl => pl.id !== socket.id);
    const payload = {
      players: lobby.players.map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        color: p.color,
        ready: p.ready
      })),
      machines: lobby.machines
    };
    io.emit("lobbyUpdate", payload);
    console.log("❌ Ayrıldı:", socket.id);
  });
});

// GAME LOOP
function startGameLoop(){
  const interval = setInterval(()=>{
    if(!lobby.started) { clearInterval(interval); return; }
    lobby.time--;
    io.emit("state", { players: lobby.players, sabotage: lobby.sabotage, time: lobby.time });
    if(lobby.time <= 0){
      io.emit("gameEnd", "⏰ Süre doldu! Oyun bitti.");
      lobby.started = false;
      lobby.players.forEach(p=>p.ready=false);
      lobby.time = 300;
    }
  }, 1000);
}

server.listen(PORT, ()=>console.log(`🚀 Server çalışıyor: ${PORT}`));