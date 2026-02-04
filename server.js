const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* === OYUN VERİLERİ === */

const rooms = {};

/* MAKİNELER – SENİN LİSTEN */
const MACHINES = [
  "Fette 1200",
  "Fette 2200",
  "Kilian KTP 720",
  "Korsch XL 400",
  "Bosch GKF 701",
  "Fette 3200",
  "Korsch XT600",
  "Fette Fe55",
  "Sejong",
  "Fette 2100"
];

const SABOTAGES = [
  "Depakin yapıştı",
  "Xatral leke var",
  "Gramaj yüksek",
  "Gramaj düşük",
  "Fıçı taştı",
  "Tablet kırık",
  "Hat düştü",
  "Tartım unutuldu"
];

/* === ODA OLUŞTUR === */
app.get("/oda-olustur", (req, res) => {
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  rooms[code] = {
    players: {},
    started: false,
    time: 300,
    sabotage: null
  };
  res.json({ code });
});

/* === SOCKET === */

io.on("connection", socket => {

  socket.on("join", ({ room, name }) => {
    if (!rooms[room]) return;

    rooms[room].players[socket.id] = {
      id: socket.id,
      name: name || "İsimsiz",
      x: 200 + Math.random() * 300,
      y: 200 + Math.random() * 300,
      color: "#" + Math.floor(Math.random()*16777215).toString(16),
      role: "WORKER"
    };

    socket.join(room);
    io.to(room).emit("state", rooms[room]);
  });

  socket.on("move", ({ room, x, y }) => {
    if (!rooms[room]) return;
    if (!rooms[room].players[socket.id]) return;
    rooms[room].players[socket.id].x = x;
    rooms[room].players[socket.id].y = y;
    io.to(room).emit("state", rooms[room]);
  });

  socket.on("start", room => {
    if (!rooms[room] || rooms[room].started) return;
    rooms[room].started = true;

    const ids = Object.keys(rooms[room].players);
    const hain = ids[Math.floor(Math.random() * ids.length)];
    rooms[room].players[hain].role = "HAIN";

    ids.forEach(id => {
      io.to(id).emit("role", rooms[room].players[id].role);
    });

    /* ZAMAN */
    const timer = setInterval(() => {
      if (!rooms[room]) return clearInterval(timer);

      rooms[room].time--;
      io.to(room).emit("time", rooms[room].time);

      if (rooms[room].time <= 0) {
        io.to(room).emit("end", "⏱️ Süre bitti!");
        clearInterval(timer);
      }
    }, 1000);
  });

  socket.on("sabotage", room => {
    if (!rooms[room]) return;
    const p = rooms[room].players[socket.id];
    if (!p || p.role !== "HAIN") return;

    const s = SABOTAGES[Math.floor(Math.random() * SABOTAGES.length)];
    rooms[room].sabotage = s;
    io.to(room).emit("sabotage", s);
  });

  socket.on("fix", room => {
    if (!rooms[room]) return;
    rooms[room].sabotage = null;
    io.to(room).emit("fix");
  });

  socket.on("disconnect", () => {
    for (const r in rooms) {
      delete rooms[r].players[socket.id];
      io.to(r).emit("state", rooms[r]);
    }
  });

});

/* === SERVER === */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log("HAİN server çalışıyor →", PORT)
);
