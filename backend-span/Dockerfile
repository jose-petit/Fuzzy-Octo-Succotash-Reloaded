# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copia y dependencias
COPY package*.json ./
RUN npm install
RUN apk add --no-cache curl

# Copia el código fuente
COPY . .

# Expone el puerto del backend
EXPOSE 3001

CMD ["npm", "start"]
