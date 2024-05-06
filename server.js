const express = require("express");
const cors = require("cors");
const { io: SocketIO } = require("socket.io-client");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const fs = require("fs");

const app = express();
const httpServer = http.createServer(app);
const ioServer = socketIo(httpServer);

app.use(express.json());
app.use(cors());

// Endpoint untuk mengambil dan menyediakan video melalui stream
app.get("/video", (req, res) => {
  const videoPath = "video.mp4";
  const videoStream = fs.createReadStream(videoPath);

  // Atur header untuk tipe konten video
  res.setHeader("Content-Type", "video/mp4");

  // Mulai streaming video ke respon
  videoStream.pipe(res);
});


app.get("/htmlcode", (req, res) => {
  const htmlcodePath = "htmlcode.html";
  const htmlcodeStream = fs.createReadStream(htmlcodePath);
  res.setHeader("Content-Type", "text/html");
  htmlcodeStream.pipe(res);
})

ioServer.on("connection", (socket) => {
  const deviceId = socket.handshake.query.deviceId;
  // Menambahkan pengecekan apakah deviceId sudah tersedia
  if (!deviceId) {
    console.log("Device ID is not provided, connection rejected");
    return;
  }
  console.log(`Device ID: ${deviceId}`);

  const socketClient = SocketIO(
    `https://kiosk-server.apidev.lol?deviceId=${deviceId}`,
    {
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 10,
      transports: ["websocket"],
      agent: false,
      upgrade: false,
      rejectUnauthorized: false,
    }
  );

  // Mengirim data deviceId setelah koneksi terbentuk
  socketClient.on("connect", () => {
    // Emit the "deviceId" event after the connection is established
    socketClient.emit("deviceId", deviceId);
  });

  // Menerima respons dari server
  socketClient.on("device", (data) => {
    console.log(
      "Received device data:",
      data["template"]["contents"][0]["url"]
    );
    const linkVideo = data["template"]["contents"][0]["url"];


    // menganti htmlcode text video-bahan menjadi link url video

    let dataSend = {
      ...data,
      template: {
        ...data.template,
        htmlCOde: data.template.htmlCode.replace(
          'video-bahan', 'http://127.0.0.1/video')
      }
    }

    console.log(dataSend)
    // Menggunakan nama file yang unik untuk menyimpan video
    const namaFile = `video.mp4`;

    simpanVideoDariLink(linkVideo, namaFile)
      .then(() => {
        console.log("Video berhasil disimpan.");
      })
      .catch((error) => {
        console.error("Gagal menyimpan video:", error);
      });

    // Memproses data dan mengirimkan respons

    //  console.log("Received device data:", data);
    // Kirim respons ke klien
    socket.emit("deviceClient", dataSend);
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

async function simpanVideoDariLink(link, namaFile) {
  try {
    const response = await axios({
      method: "GET",
      url: link,
      responseType: "stream",
    });

    const writeStream = fs.createWriteStream(namaFile);

    response.data.pipe(writeStream);

    return new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
  } catch (error) {
    console.error("Gagal menyimpan video:", error);
    throw error;
  }
}


async function saveHtmlCode(htmlCode) {
  try {
    // Save the HTML code to a file
    await fs.promises.writeFile('htmlcode.html', htmlCode);
    console.log('HTML code saved to htmlcode.html');
  } catch (error) {
    console.error('Error saving HTML code:', error);
  }
}