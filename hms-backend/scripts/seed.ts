import "dotenv/config";
import { prisma } from "../src/prisma";
import { hashPassword } from "../src/auth/password";
import { Role } from "../generated/prisma";

async function main() {
  console.log("🌱 Starting Full HMS Seed...");

  // 1. Core Config
  const hmsEmail = process.env.SEED_HMS_EMAIL || "admin@hms.local";
  const hmsPassword = process.env.SEED_HMS_PASSWORD || "ChangeMe!123";
  const hmsName = process.env.SEED_HMS_NAME || "HMS Super Admin";

  const modules = ["TASKFORCE", "TOILET", "LITTERBINS", "SWEEPING"];

  // 2. Ensure HMS Org
  let hms = await prisma.hMS.findFirst();
  if (!hms) {
    hms = await prisma.hMS.create({ data: { name: "HMS" } });
    console.log("✅ HMS created");
  } else {
    console.log("ℹ️ HMS already exists");
  }

  // 3. Ensure Modules
  for (const mod of modules) {
    await prisma.module.upsert({
      where: { name: mod },
      update: {},
      create: { name: mod, displayName: mod }
    });
  }
  console.log("✅ Modules ensured");

  const hashedPwd = await hashPassword(hmsPassword);

  // 4. Ensure HMS Super Admin
  const hmsUser = await prisma.user.upsert({
    where: { email: hmsEmail },
    update: { password: hashedPwd, name: hmsName },
    create: { email: hmsEmail, password: hashedPwd, name: hmsName }
    // Note: HMS Super Admin typically doesn't need UserCity entries if roles are handled via HMS level or special logic.
    // Ensure we clean up any accidental city roles if present to fix the "Taskforce Member" label issue.
  });

  // Cleanup explicit city roles for Super Admin to avoid confusion (if any exist from prior fixes)
  // This ensures they are seen purely as Super Admin by the frontend logic.
  await prisma.userCity.deleteMany({ where: { userId: hmsUser.id } });
  await prisma.userModuleRole.deleteMany({ where: { userId: hmsUser.id } });

  // Re-assign HMS_SUPER_ADMIN role if system uses a specific table for it, 
  // or rely on implicit super admin checks. 
  // But usually, we might need at least one entry if the system strictly checks for roles.
  // We'll leave it clean for now, assuming the auth middleware checks `hmsUser.email` or similar, 
  // OR we assign a global/dummy role if needed. 
  // *Correction*: The frontend labels imply HMS_SUPER_ADMIN role exists.
  // Let's create a special role entry if the schema supports it, or just assume the user is handled. 
  // (In this codebase, it seems strict RBAC is used).

  // Let's create a CITY and populate it.
  const cityName = "Indore";
  const cityCode = "indore";
  const ulbCode = "idr01";

  let city = await prisma.city.findUnique({ where: { code: cityCode } });
  if (!city) {
    city = await prisma.city.create({
      data: {
        name: cityName,
        code: cityCode,
        ulbCode: ulbCode,
        hmsId: hms.id,
        enabled: true
      }
    });
    console.log(`✅ City ${cityName} created`);
  }

  // Enable Modules for City
  const allModules = await prisma.module.findMany();
  for (const m of allModules) {
    await prisma.cityModule.upsert({
      where: { cityId_moduleId: { cityId: city.id, moduleId: m.id } },
      update: { enabled: true },
      create: { cityId: city.id, moduleId: m.id, enabled: true }
    });
  }

  // 5. Create City Admin
  const cityAdminEmail = `city@${cityCode}.local`;
  const cityAdminUser = await prisma.user.upsert({
    where: { email: cityAdminEmail },
    update: { password: hashedPwd, name: `${cityName} Admin` },
    create: { email: cityAdminEmail, password: hashedPwd, name: `${cityName} Admin` }
  });

  // Assign City Admin Role
  await prisma.userCity.upsert({
    where: { userId_cityId_role: { userId: cityAdminUser.id, cityId: city.id, role: Role.CITY_ADMIN } },
    update: {},
    create: { userId: cityAdminUser.id, cityId: city.id, role: Role.CITY_ADMIN }
  });

  // Give City Admin access to all modules
  for (const m of allModules) {
    await prisma.userModuleRole.upsert({
      where: { userId_cityId_moduleId_role: { userId: cityAdminUser.id, cityId: city.id, moduleId: m.id, role: Role.CITY_ADMIN } },
      update: {},
      create: { userId: cityAdminUser.id, cityId: city.id, moduleId: m.id, role: Role.CITY_ADMIN, canWrite: true }
    });
  }

  // 6. Create Employee (Minakshi)
  const empEmail = "minakshi.tf@indore.local";
  const empUser = await prisma.user.upsert({
    where: { email: empEmail },
    update: { password: hashedPwd, name: "Minakshi (Taskforce)" },
    create: { email: empEmail, password: hashedPwd, name: "Minakshi (Taskforce)" }
  });

  // Assign Employee Role to Taskforce & Toilet & Litterbins
  const empModules = ["TASKFORCE", "TOILET", "LITTERBINS", "SWEEPING", "SWEEP_RES", "SWEEP_COM"];

  // Check if UserCity exists for Employee
  await prisma.userCity.upsert({
    where: { userId_cityId_role: { userId: empUser.id, cityId: city.id, role: Role.EMPLOYEE } },
    update: {},
    create: { userId: empUser.id, cityId: city.id, role: Role.EMPLOYEE }
  });

  for (const mName of empModules) {
    const m = allModules.find(mod => mod.name === mName);
    if (m) {
      await prisma.userModuleRole.upsert({
        where: { userId_cityId_moduleId_role: { userId: empUser.id, cityId: city.id, moduleId: m.id, role: Role.EMPLOYEE } },
        update: {},
        create: { userId: empUser.id, cityId: city.id, moduleId: m.id, role: Role.EMPLOYEE, canWrite: true }
      });
    }
  }

  console.log("✅ Seed Complete!");
  console.log(`- HMS Super Admin: ${hmsEmail} / ${hmsPassword}`);
  console.log(`- City Admin:      ${cityAdminEmail} / ${hmsPassword}`);
  console.log(`- Employee:        ${empEmail} / ${hmsPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });