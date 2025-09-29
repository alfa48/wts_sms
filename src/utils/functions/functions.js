const axios = require("axios");
const fs = require("fs");
const path = require("path");
const utils = require("./../../utils/constants");

/**
 * Reseta um client do whatsapp-web.js e remove a pasta de auth do clientId.
 * @param {Client} client - instância do whatsapp-web.js
 * @param {string|null} clientId - o clientId usado em LocalAuth({ clientId }) — se não enviar, a função tenta inferir
 */
async function resetClient(client, clientId = null) {
  if (!clientId) {
    return;
  }
  // caminhos comuns onde o LocalAuth cria a pasta
  const possiblePaths = [
    path.resolve(__dirname, ".wwebjs_auth", clientId),
    path.resolve(__dirname, "wwebjs_auth", clientId),
  ];

  try {
    try {
      await client.logout();
      console.log("Logout realizado no servidor.");
    } catch (err) {
      console.warn("Logout falhou ou não necessário:", err?.message || err);
    }

    try {
      await client.destroy();
      console.log("Client destruído.");
    } catch (err) {
      console.warn(
        "Erro ao destruir client (talvez já destruído):",
        err?.message || err
      );
    }

    let removed = false;
    for (const p of possiblePaths) {
      try {
        await fs.rm(p, { recursive: true, force: true });
        console.log("Removido:::", p);
        removed = true;
      } catch (err) {}
    }

    if (!removed) {
      console.warn("::: folder auth not found for this clientId:", clientId);
    } else {
      console.log("auth local removed. next init will ask new QR.");
    }
  } catch (err) {
    console.error("Erro no resetClient:", err);
  }
}

async function notifyConnection(id, connected) {
  try {
    const url = connected
      ? "https://app.foi-sms.com/crud/campanha/conectar-whatsapp"
      : "https://app.foi-sms.com/crud/campanha/desconectar-whatsapp";

    const payload = { clienteId: id };

    const res = await axios.post(url, payload, { timeout: 5000 });

    console.log(
      `::::: [client ${id}] notify ${
        connected ? "connect" : "disconnect"
      } -> status: ${res.status}, response: ${res.data?.message || "OK"}`
    );
  } catch (err) {
    if (err.response) {
      console.error(
        `::::: [client ${id}] notify ${
          connected ? "connect" : "disconnect"
        } failed -> status: ${err.response.status}, data: ${JSON.stringify(
          err.response.data
        )}`
      );
    } else if (err.request) {
      console.error(
        `::::: [client ${id}] notify ${
          connected ? "connect" : "disconnect"
        } -> no response (timeout ou rede)`
      );
    } else {
      console.error(
        `::::: [client ${id}] notify ${
          connected ? "connect" : "disconnect"
        } error: ${err.message}`
      );
    }
  }
}

function cleanSessionDir(id) {
 const cacheDir = path.join(process.cwd(), ".wwebjs_auth");
     const sessionDir = path.join(cacheDir, `session-${id}`);
     try {
       if (fs.existsSync(sessionDir)) {
         fs.rmSync(sessionDir, { recursive: true, force: true });
         console.log(`[client:${id}] Cache removido: ${sessionDir}`);
       }
     } catch (fsErr) {
       console.error(`[client:${id}] Erro ao remover cache:`, fsErr.message);
     }
}

async function isDatabaseAvailable(prisma) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}


module.exports = { notifyConnection, resetClient, cleanSessionDir, isDatabaseAvailable };
