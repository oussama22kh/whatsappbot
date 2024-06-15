const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");
const cors = require("cors"); // Import cors

const app = express();
const port = 4002;

let qrCode;
let ready = false;

app.use(express.json());
app.use(cors()); // Enable CORS

app.listen(port, () => {
  console.log(`Local server running on http://localhost:${port}`);
});
// Create a new client instance
const client = new Client({
  authStrategy: new LocalAuth(),
  webVersionCache: {
    type: "remote",
    remotePath:
      "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
  },
});

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log("Client is ready!");
  ready = true;
});
// Route to check if client is ready
app.get("/client/ready", (req, res) => {
  res.json({ ready: ready });
});

// When the client received QR-Code
client.on("qr", (qr) => {
  console.log(qr);
  qrcode.generate(qr, { small: true });
  // Store the QR code
  qrCode = qr;
});

// Start your client
client.initialize();

client.on("message_create", (message) => {
  if (message.body === "!ping") {
    // send back "pong" to the chat the message was sent in
    client.sendMessage(message.from, "pong");
  }
});

app.get("/", async (req, res) => {
  res.json({ message: "Hello World" });
});

app.post("/", async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res
      .status(400)
      .json({ error: "Missing 'number' or 'message' field" });
  }

  try {
    await client.sendMessage(`${number}@c.us`, message);
    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Endpoint to get QR code
app.get("/qr", (req, res) => {
  if (qrCode) {
    res.status(200).json({ qrCode });
  } else {
    res.status(404).json({ error: "QR code not available" });
  }
});

// Route to close the WhatsApp session
app.post("/close-session", async (req, res) => {
  try {
    await client.logout(); // Example method to logout or close session
    await client.destroy();
    res.status(200).json({ message: "WhatsApp session closed successfully" });
  } catch (error) {
    console.error("Error closing session:", error);
    res.status(500).json({ error: "Failed to close WhatsApp session" });
  }
});

app.post("/send-messages", async (req, res) => {
  const { numbers, message } = req.body;

  if (!numbers || !message) {
    return res
      .status(400)
      .json({ error: "Missing 'numbers' or 'message' field" });
  }

  try {
    const sendPromises = numbers.map((number) =>
      client.sendMessage(`${number}@c.us`, message)
    );
    await Promise.all(sendPromises);
    res.status(200).json({ message: "Messages sent successfully" });
  } catch (error) {
    console.error("Error sending messages:", error);
    res.status(500).json({ error: "Failed to send messages" });
  }
});
