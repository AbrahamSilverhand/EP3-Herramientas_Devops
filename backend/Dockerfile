FROM node:26-alpine
 
# Actualizar paquetes del sistema operativo (Alpine) para parchear
# vulnerabilidades conocidas (ej. OpenSSL) que puedan venir en la imagen base.
RUN apk update && apk upgrade --no-cache
 
WORKDIR /app
 
COPY package*.json ./
 
RUN npm ci --ignore-scripts --omit=dev
 
COPY . .
 
EXPOSE 3001
 
CMD ["node", "server.js"]