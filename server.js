const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const rooms = {};

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ username }, cb) => {
    if (!username) return;

    const code = Math.random().toString(36).substr(2, 5).toUpperCase();

    rooms[code] = {
      players: {},
      started: false,
      sabotage: null,
      votes: {},
      machines: [
        "Fette 1200","Fette 2200","Kilian KTP 720","Korsch XL 400",
        "Bosch GKF 701","Fette 3200","Korsch XT600",
        "Fette Fe55","Sejong","Fette 2100"
      ]
    };

    rooms[code].players[socket.id] = {
      id: socket.id,
      name: username,
      x: rand(400, 1800),
      y: rand(400, 1200),
      role: "İŞÇİ",
      alive: true
    };

    socket.join(code);
    cb({ roomCode: code });
    io.to(code).emit("state", rooms[code]);
  });

  socket.on("joinRoom", ({ roomCode, username }, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb({ error: true });

    room.players[socket.id] = {
      id: socket.id,
      name: username,
      x: rand(400, 1800),
      y: rand(400, 1200),
      role: "İŞÇİ",
      alive: true
    };

    socket.join(roomCode);
    cb({ ok: true });
    io.to(roomCode).emit("state", room);
  });

  socket.on("startGame", (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.started) return;

    room.started = true;
    const ids = Object.keys(room.players);
    const h = ids[Math.floor(Math.random() * ids.length)];
    room.players[h].role = "HAIN";

    io.to(roomCode).emit("roles", room.players);
  });

  socket.on("move", ({ room, x, y }) => {
    if (!rooms[room]?.players[socket.id]) return;
    rooms[room].players[socket.id].x = x;
    rooms[room].players[socket.id].y = y;
    io.to(room).emit("state", rooms[room]);
  });

  socket.on("taskDone", (room) => {
    io.to(room).emit("taskFeedback", "✔ Görev tamamlandı");
  });

  socket.on("sabotage", (room) => {
    if (!rooms[room]) return;
    rooms[room].sabotage = "Makine sıkıştı!";
    io.to(room).emit("sabotage", rooms[room].sabotage);
  });

  socket.on("fixSabotage", (room) => {
    if (!rooms[room]) return;
    rooms[room].sabotage = null;
    io.to(room).emit("sabotage", null);
  });

  socket.on("vote", ({ room, target }) => {
    const r = rooms[room];
    if (!r) return;
    r.votes[target] = (r.votes[target] || 0) + 1;

    if (Object.keys(r.votes).length >= Object.keys(r.players).length - 1) {
      let max = 0, kicked = null;
      for (let k in r.votes) {
        if (r.votes[k] > max) {
          max = r.votes[k];
          kicked = k;
        }
      }
      if (kicked && r.players[kicked]) {
        r.players[kicked].alive = false;
        io.to(room).emit("kicked", r.players[kicked].name);
      }
      r.votes = {};
    }
  });

  socket.on("disconnect", () => {
    for (const r in rooms) {
      if (rooms[r].players[socket.id]) {
        delete rooms[r].players[socket.id];
        if (!Object.keys(rooms[r].players).length) delete rooms[r];
        else io.to(r).emit("state", rooms[r]);
      }
    }
  });
});

server.listen(PORT, () => console.log("🚀 RUNNING", PORT));