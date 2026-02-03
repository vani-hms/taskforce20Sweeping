require("dotenv").config();
const { PrismaClient } = require("../generated/prisma");
const p = new PrismaClient();
(async () => {
  try {
    await p.$connect();
    console.log("ok connect");
    const r = await p.$queryRaw`select 1 as one`;
    console.log(r);
  } catch (e) {
    console.error("err", e);
  } finally {
    await p.$disconnect();
  }
})();
