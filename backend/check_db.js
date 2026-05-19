const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRaw`PRAGMA table_info(Worker)`.then(res => { console.log(res); process.exit(0); });
