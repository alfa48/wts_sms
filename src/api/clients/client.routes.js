const express = require("express");
const router = express.Router();
const controller = require("./client.controller");

router.post("/create", controller.createClient); // cria novo client e retorna id
router.get("/qr/:id", controller.getQr);
router.post("/send/:id", controller.sendMessage);// Rota para enviar mensagem

// nova rota para desconectar
router.delete("/delete/:id", controller.disconnectClient);

module.exports = router;
