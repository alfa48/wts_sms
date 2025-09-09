// clients.store.js
const clients = {}; // { clientId: { client, qr, status } }

function setClient(clientId, data) {
  clients[clientId] = { ...clients[clientId], ...data };
}

function getClient(clientId) {
  return clients[clientId] || null;
}

function getAllClients() {
  return clients;
}

module.exports = { setClient, getClient, getAllClients };
