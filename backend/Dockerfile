FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
VOLUME ["/app/uploads", "/app/data"]
CMD ["node", "src/server.js"]
