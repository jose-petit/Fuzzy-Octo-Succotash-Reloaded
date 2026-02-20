FROM node:18-alpine
WORKDIR /app
# Copy package files first for caching
COPY backend-performance/package.json ./package.json
RUN npm install --production
# Copy modular source code
COPY backend-performance/src ./src
COPY backend-performance/index.js ./index.js
COPY lib ./lib
EXPOSE 5000
CMD ["node", "index.js"]
