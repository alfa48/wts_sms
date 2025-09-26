// controllers/clientController.js
const clientService = require("./../../services/client/clientService");

exports.createClient = async (req, res) => {
  try {
    const id = await clientService.createClient();
    res.json({
      clientId: id,
      message: "Client created. Use the urls to fetch QR code or send messages",
      url1: `http://localhost:3000/api/clients/qr/${id}`,
      url2: `http://localhost:3000/api/clients/send/${id}`,
    });
  } catch (err) {
    res.status(500).send("Internal error when creating client");
  }
};

exports.getQr = async (req, res) => {
  try {
    const result = await clientService.getQr(req.params.id);
    if (result.status) return res.json(result);
    return res.send(`<img src="${result.qrImage}"/>`);
  } catch (err) {
    if (err.message === "NOT_FOUND")
      return res.status(404).send("Client not found");
    if (err.message === "QR_NOT_READY")
      return res.status(404).send("QR not ready yet");
    res.status(500).send("Internal error when getting QRCode");
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { to, message } = req.body;
    const result = await clientService.sendMessage(id, to, message);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message === "NOT_FOUND")
      return res.status(404).json({ error: "Client not found" });
    if (err.message === "NOT_CONNECTED")
      return res.status(400).json({ error: "Client not connected" });
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
};

exports.disconnectClient = async (req, res) => {
  const { id } = req.params;

  try {
    await clientService.disconnectClient(id);
    res.json({ success: true, message: `Client ${id} desconectado` });
  } catch (err) {
    console.error("Erro ao desconectar client:", err.message || err);
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Client not found" });
    }
    return res.status(500).json({ error: "Erro ao desconectar cliente" });
  }
};
