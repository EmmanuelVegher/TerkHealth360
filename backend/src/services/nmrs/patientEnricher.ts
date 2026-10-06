// Patient Clinical Bio Data & Encounter Synchronizer for TerkHealth360 NMRS / OpenMRS Integration
// Uses official FHIR R4 and OpenMRS REST API standards to synchronize authentic demographics, visits, and encounters.
import { prisma } from '../../prisma.js';
import { NmrsDataBridge } from './nmrsDataBridge.js';

export async function enrichPatientBioDataAndVisits(patientId: string): Promise<any> {
  // Delegate directly to the FHIR R4 & REST data bridge
  return NmrsDataBridge.syncPatientExactNmrsRecord(patientId);
}

/**
 * Batch synchronize all hospital patients lacking bio data or clinical encounters with NMRS FHIR & REST data.
 */
export async function enrichAllPatientsCohort(limit: number = 250): Promise<{ enrichedCount: number }> {
  const unenriched = await prisma.patient.findMany({
    where: {
      OR: [
        { nin: null },
        { addresses: { none: {} } },
        { telecoms: { none: {} } },
        { visits: { none: {} } }
      ]
    },
    take: limit,
    select: { id: true }
  });

  let enrichedCount = 0;
  for (const p of unenriched) {
    try {
      await NmrsDataBridge.syncPatientExactNmrsRecord(p.id);
      enrichedCount++;
    } catch (err: any) {
      console.warn(`[Cohort Enricher] Skipping patient ${p.id}: ${err.message}`);
    }
  }

  return { enrichedCount };
}
