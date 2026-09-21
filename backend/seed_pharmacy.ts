import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding Pharmacy Inventory...");
  
  const items = [
    {
      itemCode: 'MED-001',
      brandName: 'Amoxil',
      genericName: 'Amoxicillin',
      classification: 'Antibiotics',
      form: 'Capsule',
      strength: '500mg',
      dosageForm: 'Capsule',
      unitOfIssue: 'Pack',
      unitPrice: 1500,
    },
    {
      itemCode: 'MED-002',
      brandName: 'Panadol',
      genericName: 'Paracetamol',
      classification: 'Analgesics',
      form: 'Tablet',
      strength: '500mg',
      dosageForm: 'Tablet',
      unitOfIssue: 'Pack',
      unitPrice: 500,
    },
    {
      itemCode: 'MED-003',
      brandName: 'Artemether',
      genericName: 'Artemether/Lumefantrine',
      classification: 'Antimalarial',
      form: 'Tablet',
      strength: '80/480mg',
      dosageForm: 'Tablet',
      unitOfIssue: 'Pack',
      unitPrice: 2000,
    }
  ];

  for (const it of items) {
    const item = await prisma.pharmacyInventoryItem.upsert({
      where: { itemCode: it.itemCode },
      update: {},
      create: it
    });
    
    await prisma.pharmacyStockBatch.create({
      data: {
        itemId: item.id,
        batchNumber: `B-${it.itemCode}-${Math.floor(Math.random()*1000)}`,
        expiryDate: new Date('2027-12-31'),
        quantity: 100,
        unitCost: it.unitPrice * 0.8,
        warehouseId: null,
      }
    });
  }

  console.log("Seeded pharmacy items and batches.");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
