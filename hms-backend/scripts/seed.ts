import "dotenv/config";
import { prisma } from "../src/prisma";
import { hashPassword } from "../src/auth/password";
import { Role } from "../generated/prisma";

async function main() {
  const email = process.env.SEED_HMS_EMAIL || "admin@hms.local";
  const password = process.env.SEED_HMS_PASSWORD || "ChangeMe!123";
  const name = process.env.SEED_HMS_NAME || "HMS Super Admin";

  const hms = await prisma.hMS.upsert({
    where: { name: "HMS" },
    create: { name: "HMS" },
    update: {}
  });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User already exists: ${email}. No changes made.`);
    return;
  }

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name
    }
  });

  // HMS super admin does not require a city membership; roles are assigned via JWT claims.
  console.log("Seed complete.");
  console.log({ hms: hms.name, user: { email: user.email, name: user.name, id: user.id }, password });
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
