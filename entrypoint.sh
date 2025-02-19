#!/bin/sh

echo "Procurando pasta node_modules..."
# Verifica se a pasta node_modules existe
if [ ! -d "node_modules" ]; then
  echo "node_modules não encontrado. Instalando dependências..."
  npm install
else
  echo "Node_modules encontrado. Pulando a instalação de dependências."
fi

# Inicia a aplicação
npm run start -- --host 0.0.0.0
