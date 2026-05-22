const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const workers = await prisma.worker.findMany();
  console.log(JSON.stringify(workers, null, 2));
  await prisma.$disconnect();
}
run();
