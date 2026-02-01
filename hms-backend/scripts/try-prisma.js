require('dotenv').config();
const { PrismaClient } = require('../generated/prisma');
const p = new PrismaClient();
(async () => {
  try {
    await p.$connect();
    console.log('prisma connect ok');
    const r = await p.$queryRaw`select 1`;
    console.log(r);
  } catch (e) {
    console.error('err', e);
  } finally {
    await p.$disconnect();
  }
})();
