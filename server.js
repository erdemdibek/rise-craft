const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ODA VERİLERİ
const rooms = {};

// STATİK DOSYALAR
app.use(express.static(path.join(__dirname, "public")));

// ANA SAYFA
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// SOCKET
io.on("connection", (socket) => {
  console.log("🔌 Bağlanan:", socket.id);

  // ODA OLUŞTUR
  socket.on("createRoom", ({ username }, callback) => {
    if (!username) return;

    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

    rooms[roomCode] = {
      players: {},
      machines: [
        "Fette 1200",
        "Fette 2200",
        "Kilian KTP 720",
        "Korsch XL 400",
        "Bosch GKF 701",
        "Fette 3200",
        "Korsch XT600",
        "Fette Fe55",
        "Sejong",
        "Fette 2100",
      ],
    };

    rooms[roomCode].players[socket.id] = {
      id: socket.id,
      name: username,
    };

    socket.join(roomCode);

    callback({ roomCode });
    io.to(roomCode).emit("roomUpdate", rooms[roomCode]);
  });

  // ODAYA KATIL
  socket.on("joinRoom", ({ roomCode, username }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      callback({ error: "Oda bulunamadı" });
      return;
    }

    room.players[socket.id] = {
      id: socket.id,
      name: username,
    };

    socket.join(roomCode);
    callback({ success: true });

    io.to(roomCode).emit("roomUpdate", room);
  });

  // BAĞLANTI KESİLİRSE
  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      if (room.players[socket.id]) {
        delete room.players[socket.id];

        if (Object.keys(room.players).length === 0) {
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit("roomUpdate", room);
        }
      }
    }
    console.log("❌ Ayrıldı:", socket.id);
  });
});

// SERVER START
server.listen(PORT, () => {
  console.log(`🚀 Server çalışıyor: ${PORT}`);
});
