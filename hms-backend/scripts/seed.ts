import "dotenv/config";
import { prisma } from "../src/prisma";
import { hashPassword } from "../src/auth/password";

async function main() {
  console.log("🌱 Starting HMS seed");

  const email = process.env.SEED_HMS_EMAIL || "admin@hms.local";
  const password = process.env.SEED_HMS_PASSWORD || "ChangeMe!123";
  const name = process.env.SEED_HMS_NAME || "HMS Super Admin";
  const modules = ["TASKFORCE", "TOILET"];

  // Ensure HMS org exists
  let hms = await prisma.hMS.findFirst();
  if (!hms) {
    hms = await prisma.hMS.create({ data: { name: "HMS" } });
    console.log("✅ HMS created");
  } else {
    console.log("ℹ️ HMS already exists");
  }

  // Ensure base modules exist
  for (const mod of modules) {
    await prisma.module.upsert({
      where: { name: mod },
      update: {},
      create: { name: mod }
    });
  }
  console.log("✅ Base modules ensured (TASKFORCE, TOILET)");

  const hashed = await hashPassword(password);

  // Upsert super admin user and refresh password so login always works locally
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, name },
    create: { email, password: hashed, name }
  });

  console.log("✅ HMS Super Admin user ready");
  console.log({ hms: hms.name, user: { id: user.id, email: user.email }, password });
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
