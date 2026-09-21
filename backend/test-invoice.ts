import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const p1 = await prisma.patient.findFirst({ where: { firstName: 'Oluwaseun' }});
  const p2 = await prisma.patient.findFirst({ where: { firstName: 'Emeka' }});
  console.log('Oluwaseun ID:', p1?.id);
  console.log('Emeka ID:', p2?.id);
  
  if (p1) console.log('Oluwaseun Invoices:', await prisma.invoice.findMany({ where: { patientId: p1.id } }));
  if (p2) console.log('Emeka Invoices:', await prisma.invoice.findMany({ where: { patientId: p2.id } }));
}
run();
