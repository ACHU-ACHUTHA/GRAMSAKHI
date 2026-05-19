const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const w1 = await prisma.worker.create({
      data: { name: 't1', email: 't1@example.com' }
    });
    console.log("w1", w1);
    
    const w2 = await prisma.worker.create({
      data: { name: 't2', email: 't2@example.com' }
    });
    console.log("w2", w2);
  } catch (e) {
    console.error("DB Error:", e.message);
  }
}
main();
