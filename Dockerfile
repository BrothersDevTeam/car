FROM node:22 as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist/car /usr/share/nginx/html
# COPY --from=builder /app/dist/car/browser /usr/share/nginx/html

# Copia a configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# COPY mime.types /etc/nginx/mime.types

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]
