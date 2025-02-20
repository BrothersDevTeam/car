# FROM node:22 as builder

# WORKDIR /app

# COPY package*.json ./
# RUN npm ci

# COPY . .
# RUN npm run build

# FROM nginx:alpine

# COPY --from=builder /app/dist/car /usr/share/nginx/html
# # COPY --from=builder /app/dist/car/browser /usr/share/nginx/html

# # Copia a configuração personalizada do Nginx
# COPY nginx.conf /etc/nginx/nginx.conf

# # COPY mime.types /etc/nginx/mime.types

# EXPOSE 80

# CMD [ "nginx", "-g", "daemon off;" ]

# /////////////////////////////////

FROM node:22.14-slim

USER node

WORKDIR /home/node/app/

COPY ./entrypoint.sh /home/node/app/entrypoint.sh

EXPOSE 4200

ENTRYPOINT ["/bin/sh", "-c", "chmod +x /home/node/app/entrypoint.sh && /home/node/app/entrypoint.sh"]
