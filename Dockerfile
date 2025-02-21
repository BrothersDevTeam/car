# # FROM node:22 as builder

# # WORKDIR /app

# # COPY package*.json ./
# # RUN npm ci

# # COPY . .
# # RUN npm run build

# # FROM nginx:alpine

# # COPY --from=builder /app/dist/car /usr/share/nginx/html
# # # COPY --from=builder /app/dist/car/browser /usr/share/nginx/html

# # # Copia a configuração personalizada do Nginx
# # COPY nginx.conf /etc/nginx/nginx.conf

# # # COPY mime.types /etc/nginx/mime.types

# # EXPOSE 80

# # CMD [ "nginx", "-g", "daemon off;" ]

# # ============================================================

# FROM node:22.14-slim

# WORKDIR /home/node/app/

# # Copia os arquivos antes de mudar o usuário
# COPY --chown=node:node . /home/node/app/

# # Troca para o usuário node
# USER node

# # Garante que o entrypoint tenha permissão de execução
# RUN chmod +x /home/node/app/entrypoint.sh

# EXPOSE 4200

# # ENTRYPOINT ["/home/node/app/entrypoint.sh"]
# RUN npm install
# ENTRYPOINT ["npm", "run", "start", "--", "--host", "0.0.0.0"]

# ==========================================================================================================

# # Criar a imagem sem usar o entrypoint.sh Essa imagem será usada para o deploy no github actions
# FROM node:22.14-slim

# WORKDIR /home/node/app/

# # Copia os arquivos antes de mudar o usuário
# COPY --chown=node:node . /home/node/app/

# # Troca para o usuário node
# USER node

# EXPOSE 4200

# ENTRYPOINT ["npm", "run", "start", "--", "--host", "0.0.0.0"]

# ==========================================================================================================
# engninx

FROM node:lts AS builder
WORKDIR /home/node/app
COPY . .
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=builder /home/node/app/dist/car/browser /usr/share/nginx/static
COPY nginx.conf /etc/nginx/nginx.conf
COPY mime.types /etc/nginx/mime.types
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
