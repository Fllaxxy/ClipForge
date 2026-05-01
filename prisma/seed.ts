import { hash } from "bcryptjs";
import { getDb } from "../src/lib/db";

const db = getDb();

async function main() {
  const adminPassword = await hash("admin12345", 12);
  const demoPassword = await hash("demo12345", 12);

  const admin = await db.user.upsert({
    where: { email: "admin@clipforge.local" },
    create: {
      name: "ClipForge Admin",
      email: "admin@clipforge.local",
      passwordHash: adminPassword,
      role: "ADMIN",
      subscription: {
        create: {
          plan: "PRO",
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }
    },
    update: {
      role: "ADMIN"
    }
  });

  await db.user.upsert({
    where: { email: "demo@clipforge.local" },
    create: {
      name: "Demo Creator",
      email: "demo@clipforge.local",
      passwordHash: demoPassword,
      subscription: {
        create: {
          plan: "FREE",
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }
    },
    update: {}
  });

  console.log(`Seeded ClipForge users. Admin: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
