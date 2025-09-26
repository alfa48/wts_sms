// testNotify.js
const { notifyConnection } = require("../utils/functions/functions");

async function run() {
  console.log("=== Teste  notifyConnection conectar ===");
  await notifyConnection("teste123", true);

  console.log("=== Teste notifyConnection desconectar ===");
  await notifyConnection("teste123", false);
}

run();
