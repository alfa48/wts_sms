// services/clientService.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const utils = require("./../../utils/constants");
const clientRepo = require("../../repositories/client/clientRepository");
const { notifyConnection } = require("./../../utils/functions/functions");
const functions = require("./../../utils/functions/functions");
const fs = require("fs");
const path = require("path");

const activeClients = new Map();

function initClient(id) {
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: id }),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-domain-reliability',
      '--disable-renderer-backgrounding',
      '--mute-audio',
      '--metrics-recording-only',
      '--no-default-browser-check',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"'
    ]
  });

  activeClients.set(id, {
    client,
    status: utils.STATE_DISCONNECTED,
    qr: null,
    timeout: null,
  });

  client.on("qr", (qr) => {
  console.log(`[client ${id}] QR gerado`);

  const existing = activeClients.get(id);
  // Só cria o timeout se ainda não existir
  if (!existing?.timeout) {
    const timeout = setTimeout(() => {
      const cData = activeClients.get(id);
      if (cData && cData.status !== utils.STATE_CONNECTED) {
        console.log(`[client ${id}] Tempo máximo expirou, destruindo instância...`);
        try {
          cData.client.destroy();
        } catch (err) {
          console.error(`[client ${id}] erro ao destruir client:`, err.message);
        }
        clientRepo.setClient(id, { status: utils.STATE_DISCONNECTED });
        activeClients.delete(id);
      }
    }, 5 * 60 * 1000); // 5 minutos totais

    activeClients.set(id, { client, qr, timeout, status: utils.STATE_DISCONNECTED });
  }
  else {activeClients.set(id, { ...existing, qr, status: utils.STATE_DISCONNECTED });}

  clientRepo.setClient(id, { status: utils.STATE_DISCONNECTED });
});


  client.on("ready", async () => {
    try {
      console.log(`::::: [client ${id}] connected`);
      const cData = activeClients.get(id);
      if (cData?.timeout) {
        clearTimeout(cData.timeout);
        console.log(`::::: [client ${id}] timeout cleared`);
      }
      console.log(`::::: [client ${client.status}] status set to CONNECTED`);
      activeClients.set(id, { client, status: utils.STATE_CONNECTED });
      await clientRepo.setClient(id, { status: utils.STATE_CONNECTED });
      notifyConnection(id, true); // conectado
    } catch (err) {
      console.error(`::::: [client ${id}] ready handler error:`, err.message);
    }
  });

  // Evento: cliente desconectado
  client.on("disconnected", () => {
    try {
      console.log(`::::: [client ${id}] disconnected`);
      exports.disconnectClient(id);
      notifyConnection(id, false); // desconectado
    } catch (err) {
      console.error(
        `::::: [client ${id}] disconnected handler error:`,
        err.message
      );
    }
  });

  // Evento: falha de autenticação
  client.on("auth_failure", (msg) => {
    try {
      console.error(`::::: [client ${id}] auth failure:`, msg);
      clientRepo.setClient(id, { status: utils.STATE_DISCONNECTED });
    } catch (err) {
      console.error(
        `::::: [client ${id}] auth_failure handler error:`,
        err.message
      );
    }
  });

  client.on("message", (msg) => {
    console.log(`::::: [client ${id}] mensagem recebida : type: ${msg.type}`);
    // Aqui você pode adicionar lógica para processar a mensagem recebida
  });

  // Protege a inicialização
  try {
    client.initialize();
  } catch (err) {
    console.error(`::::: [client ${id}] initialize error:`, err.message);
  }

  return client;
}

exports.createClient = async () => {
  try {
    const id = uuidv4();
    console.log(`[client:${id}] Criando novo cliente no banco...`);

    // Aguarda persistência no banco
    await clientRepo.setClient(id, {
      status: utils.STATE_DISCONNECTED,
      qrGeneratedAt: null,
    });

    console.log(`[client:${id}] Cliente registrado com sucesso no DB`);
    return id;
  } catch (err) {
    console.error("[clientService] createClient error:", err.message);
    throw err;
  }
};

exports.getQr = async (id) => {
  console.log(`[client:${id}] QR code requested`);

  let client = null;
  let clientData = activeClients.get(id);

  if (!clientData) {
    clientData = await clientRepo.getClient(id);

    if (!clientData) {
      console.warn(`[client:${id}] Não encontrado na memória nem no DB.`);
      throw new Error("NOT_FOUND");
    }
    console.log(`[client:${id}] Encontrado no DB. Inicializando cliente...`);
    console.log(clientData.status);
    if (clientData.status === utils.STATE_CONNECTED) {
      return { status: utils.STATE_CONNECTED };
    }
    try {
      functions.cleanSessionDir(id);
      client = initClient(id);
    } catch (err) {
      console.error(`::::: [client ${id}] initialize error:`, err.message);
    }

    if (!client) {
      throw new Error("NOT_FOUND");
    }
    // Adiciona ao Map (em memória)
    activeClients.set(id, {
      client,
      status: utils.STATE_DISCONNECTED,
      qr: null,
      timeout: null,
    });
  }

  // Espera até o QR ser gerado (máximo 10s)
  let tries = 0;
  while (!clientData.qr && tries < 20) {
    await new Promise((r) => setTimeout(r, 1000)); // espera 0.5s
    clientData = activeClients.get(id);
    tries++;
  }

  if (!clientData.qr) {
    throw new Error(`[client:${id}] QR não foi gerado a tempo`);
  }

  const qrImage = await QRCode.toDataURL(clientData.qr);
  console.log(`[client:${id}] Retornando QR code atualizado`);
  return { qrImage };
};

exports.sendMessage = async (id, to, message) => {
  const clientData = activeClients.get(id);
  if (!clientData || !clientData.client) throw new Error("NOT_FOUND");
  console.log(`[client:${id}] Enviando mensagem para ${clientData}`);
  if (clientData.status !== utils.STATE_CONNECTED)
    throw new Error("NOT_CONNECTED");
  if (!to || !message) {
    throw new Error("INVALID_INPUT");
  }
  const chatId = to.includes("@c.us") ? to : `${to}@c.us`;
  const response = await clientData.client.sendMessage(chatId, message);
  console.log(`[client:${id}] Message sent to ${chatId}`);
  return { chatId, message, responseId: response.id.id };
};

exports.disconnectClient = async (id) => {
  try {
    console.log(`::::: [service] disconnectClient -> ${id}`);

    if (clientRepo.getClient(id)) {
      await clientRepo.setClient(id, { status: utils.STATE_DISCONNECTED });
    } else {
      throw new Error("NOT_ACTIVE");
    }
    const clientData = activeClients.get(id);
    if (!clientData || !clientData.client) {
      functions.cleanSessionDir(id);
      console.warn(`[service] client${id} não está activo`);
      throw new Error("NOT_ACTIVE");
    }
    const client = clientData.client;

    try {
      await client.destroy();
      console.log(`[client:${id}] Instância destruída com sucesso.`);
    } catch (destroyErr) {
      console.error(
        `[client:${id}] Erro ao destruir instância:`,
        destroyErr.message
      );
    }
    activeClients.delete(id);
    console.log(`[client:${id}] Removido do activeClients.`);
    functions.cleanSessionDir(id);
    return true;
  } catch (err) {
    console.error(
      `::::: [service] disconnectClient error -> ${id}:`,
      err.message
    );
    throw err;
  }
};

exports.bootstrapClients = async () => {
  const persisted = await clientRepo.getAllPersisted();

  for (const client of persisted) {
    if (client.status === utils.STATE_CONNECTED) {
      console.log(`[client:${client.id}] Restoring client from persistence`);
      initClient(client.id);
      console.log(`[bootstrapClients] ::: Reconectar client ${client.id}...`);
      // Aguarda 2 segundos entre cada inicialização para evitar sobrecarga
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};
