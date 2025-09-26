const express = require('express');
const cors = require('cors');
require("dotenv").config();
const app = express();


app.use(cors());
app.use(express.json());

//middlewares

// Rotas
const clientRoutes = require('./api/clients/client.routes');
app.use('/api/clients', clientRoutes);

module.exports = app;
