const store = require("./../../api/clients/clients.store");
const { Client, LocalAuth } = require("whatsapp-web.js");

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "meuCliente" }),
});

client.on("qr", (qr) => {
  console.log("Novo QR gerado");
  store.setClient("meuCliente", { qr, status: "DISCONNECTED" });
});

client.on("ready", () => {
  console.log("WhatsApp conectado!");
  store.setClient("meuCliente", { status: "CONNECTED", qr: null });
});

client.initialize();
