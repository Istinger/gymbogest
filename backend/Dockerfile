FROM node:20-alpine
# Prisma necesita OpenSSL; Alpine (musl) no lo trae por defecto.
RUN apk add --no-cache openssl libssl3
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
# El entrypoint regenera el cliente Prisma y aplica migraciones al arrancar:
# el volumen anónimo /app/node_modules sobrevive a los rebuilds y taparía
# el cliente generado arriba (ver CLAUDE.md, gotchas Prisma+Docker).
CMD ["sh", "docker-entrypoint.dev.sh"]
