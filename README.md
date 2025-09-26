# wts_sms
acessa o endpoint
http://localhost:3000/api/clients/create


##Redis
# Atualiza pacotes
sudo apt update

# Instala o Redis
sudo apt install redis-server -y

# Verifica a versão
redis-server --version

# Inicia o serviço
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Testa se está rodando
redis-cli ping
# Deve responder: PONG

# intalar no node
npm install ioredis
