const path = require('path');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.join(__dirname, `.env.${env}`) });

const { startServer } = require('./src/core.server');

startServer();