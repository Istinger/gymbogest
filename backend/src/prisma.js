// Cliente Prisma único para toda la aplicación (patrón singleton).
// Los servicios NO crean su propio cliente: lo reciben inyectado (SOLID-D).
const { PrismaClient } = require('@prisma/client');
module.exports = new PrismaClient();
