FROM node:20-alpine
# Prisma necesita OpenSSL; Alpine (musl) no lo trae por defecto.
RUN apk add --no-cache openssl libssl3
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "dev"]
