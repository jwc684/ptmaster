import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

function mapCategoryToType(category: string): "WEIGHT" | "CARDIO" | "BODYWEIGHT" {
  if (category === "유산소") return "CARDIO";
  return "WEIGHT";
}

function mapEquipmentToType(equipment: string, category: string): "WEIGHT" | "CARDIO" | "BODYWEIGHT" {
  if (category === "유산소") return "CARDIO";
  if (equipment === "맨몸") return "BODYWEIGHT";
  return "WEIGHT";
}

async function main() {
  console.log("Starting exercise seeding...");

  const csvPath = path.join(__dirname, "../prisma/exercises.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.trim().split("\n");

  // Skip header
  const dataLines = lines.slice(1);
  console.log(`Found ${dataLines.length} exercises in CSV`);

  // Get existing system exercises
  const existing = await prisma.exercise.findMany({
    where: { isSystem: true },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((e) => e.name));
  console.log(`Found ${existingNames.size} existing system exercises`);

  let created = 0;
  let skipped = 0;

  for (const line of dataLines) {
    // Parse CSV (simple - no quoted fields expected)
    const parts = line.split(",");
    if (parts.length < 4) continue;

    const name = parts[1].trim();
    const category = parts[2].trim();
    const equipment = parts[3].trim();

    if (!name || !category) continue;

    if (existingNames.has(name)) {
      skipped++;
      continue;
    }

    const type = mapEquipmentToType(equipment, category);

    await prisma.exercise.create({
      data: {
        name,
        type,
        category,
        equipment: equipment || null,
        isSystem: true,
      },
    });

    existingNames.add(name);
    created++;
  }

  console.log(`Exercise seeding complete: ${created} created, ${skipped} skipped (already exist)`);
}

main()
  .catch((e) => {
    console.error("Exercise seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
