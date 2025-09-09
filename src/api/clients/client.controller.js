// controllers/clientController.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const { v4: uuidv4 } = require("uuid");
const utils = require("../../utils/constants");
const store = require("./clients.store");
const QRCode = require("qrcode");

// cria um novo client e retorna QR + id
exports.createClient = async (req, res) => {
  try {
    const id = uuidv4(); // gera um id único para o client
    console.log("::::: Creating new client with id:", id);

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: id }),
    });

    // salva no store
    store.setClient(id, { client, status: utils.STATE_DISCONNECTED, qr: null });

    // evento de QR
    client.on("qr", (qr) => {
      console.log(`::::: QRCode generated for client ${id}`);
      store.setClient(id, { qr, status: utils.STATE_DISCONNECTED });
    });

    // evento quando conecta
    client.on("ready", () => {
      console.log(`::::: Client ${id} connected!`);
      store.setClient(id, { status: utils.STATE_CONNECTED, qr: null });
    });

    client.initialize();

    // resposta inicial: apenas devolve id
    res.json({
      clientId: id,
      message: "Client created. Use the url1 to fetch QR code end to send messages url2",
      url1:
        "http://localhost:3000/api/clients/qr/:clientId",
      url2:
        "http://localhost:3000/api/clients/send/:clientId",
    });
  } catch (err) {
    console.error("::::: Error creating client:", err.message);
    return res.status(500).send("Internal error when creating client");
  }
};

// pega o QR pelo id
exports.getQr = async (req, res) => {
  const id = req.params.id;
  console.log("::::: Trying to get QRCode for client:", id);

  try {
    const clientData = store.getClient(id);

    if (!clientData) {
      console.error("Client not found:", id);
      return res.status(404).send("Client not found");
    }

    if (clientData.status === utils.STATE_CONNECTED) {
      console.log("::::: Client already connected");
      return res.json({ status: utils.STATE_CONNECTED });
    }

    if (!clientData.qr) {
      console.log("::::: QRCode not ready yet");
      return res.status(404).send("QR not ready yet");
    }

    console.log("::::: QRCode ready");
    const qrImage = await QRCode.toDataURL(clientData.qr);
    return res.send(`<img src="${qrImage}"/>`);
  } catch (err) {
    console.error("::::: Internal error when getting QRCode:", err.message);
    return res.status(500).send("Internal error when getting QRCode");
  }
};

// envia mensagem
exports.sendMessage = async (req, res) => {
  const { id } = req.params; // id do client
  const { to, message } = req.body; // número e texto

  try {
    const clientData = store.getClient(id);

    if (!clientData || !clientData.client) {
      return res.status(404).json({ error: "Client not found" });
    }

    if (clientData.status !== "CONNECTED") {
      return res.status(400).json({ error: "Client not connected" });
    }

    // o número precisa estar no formato internacional com @c.us
    const chatId = to.includes("@c.us") ? to : `${to}@c.us`;

    const response = await clientData.client.sendMessage(chatId, message);

    return res.json({
      success: true,
      to: chatId,
      message,
      responseId: response.id.id,
    });
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
    return res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
};
