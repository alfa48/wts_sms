const { PrismaClient } = require("@prisma/client");
const utils = require("./../../utils/constants");
const prisma = new PrismaClient();


exports.setClient = async (id, data) => {
  const toPersist = {
    id,
    status: data.status || utils.STATE_DISCONNECTED,
    qrGeneratedAt: data.qrGeneratedAt ? new Date(data.qrGeneratedAt) : null,
  };

  try {
    await prisma.client.upsert({
      where: { id },
      update: toPersist,
      create: toPersist,
    });

    console.log(`[repo] setClient -> ${id} atualizado com sucesso`);
  } catch (error) {
    console.error(`[repo] Erro ao salvar client ${id}:`, error.message);
  }
};


exports.getClient = async (id) => {
  try {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      console.warn(`[repo] Client não encontrado: ${id}`);
      return null;
    }
    return client;
  } catch (error) {
    console.error(`[repo] Erro ao buscar client ${id}:`, error.message || error);
    return null;
  }
};


exports.deleteClient = async (id) => {
  try {
    await prisma.client.delete({ where: { id } });
    console.log(`[repo] deleteClient -> ${id}`);
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      console.warn(`[repo] Cliente ${id} não existe, nada para apagar.`);
    } else {
      console.error(`[repo] Erro ao apagar client ${id}:`, error.message || error);
    }
    return false;
  }
};


exports.getAllPersisted = async () => {
  try {
    const clients = await prisma.client.findMany();
    return clients;
  } catch (error) {
    console.error(`[repo] Erro ao buscar todos os clients:`, error.message || error);
    return [];
  }
};

