const express = require("express");
const app = require("./core.app");
const clientService = require("./services/client/clientService");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const URL =
process.env.URL_BASE || `http://localhost:${PORT}`;

function startServer() {
  app.listen(PORT, async () => {
   console.log(`Server run in ${URL} na porta: ${PORT}`);
  });

  clientService.bootstrapClients();
}

module.exports = { startServer };