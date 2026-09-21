import { PrismaClient } from '@prisma/client';
import { autoAdvanceVisitToStatus } from './src/routes/workflow.js';

async function main() {
  await autoAdvanceVisitToStatus('720a93d8-9e4f-4f9c-9e28-eda3c31e1473', 'WAITING_CONSULTATION');
  console.log('Done');
}
main();
