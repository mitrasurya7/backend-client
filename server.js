const express = require("express");
const cors = require("cors");
const { io: SocketIO } = require("socket.io-client");
const http = require('http');
const socketIo = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const ioServer = socketIo(httpServer);

app.use(express.json());
app.use(cors());

ioServer.on("connection", (socket) => {
  const deviceId = socket.handshake.query.deviceId;
  // Menambahkan pengecekan apakah deviceId sudah tersedia
  if (!deviceId) {
    console.log("Device ID is not provided, connection rejected");
    return;
  }
  console.log(`Device ID: ${deviceId}`);

  const socketClient = SocketIO(`https://kiosk-server.apidev.lol?deviceId=${deviceId}`, {
    reconnectionDelay: 1000,
    reconnection: true,
    reconnectionAttempts: 10,
    transports: ["websocket"],
    agent: false,
    upgrade: false,
    rejectUnauthorized: false,
  });

  // Mengirim data deviceId setelah koneksi terbentuk
  socketClient.on("connect", () => {
    console.log("Connected to server");
    // Emit the "deviceId" event after the connection is established
    socketClient.emit("deviceId", deviceId);
  });

  // Menerima respons dari server
  socketClient.on("device", (data) => {
    console.log("Received device data:", data);
    // Kirim respons ke klien
    socket.emit("deviceClient", data);
  });

  // Menangani event disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // Memutus koneksi socketClient
    socketClient.disconnect();
    // Hapus referensi socketClient dari memori
    delete socketClient;
  });
});


const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server started on port ${PORT}`));
