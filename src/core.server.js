const express = require("express");
const app = require("./core.app");

require("dotenv").config();

const PORT = process.env.PORT || 3000;
const URL =
  process.env.URL_BASE || `http://localhost:${PORT}`;

function startServer() {
  app.listen(PORT, async () => {
   console.log(`Server run in ${URL} na porta: ${PORT}`);
  });
}

module.exports = { startServer };
