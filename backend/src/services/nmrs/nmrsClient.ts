import axios, { AxiosInstance } from 'axios';
import { prisma } from '../../prisma.js';
import { DEFAULT_NMRS_SCHEMAS } from './defaultSchemas.js';
import { resolveConceptName, resolveObsValue, fetchConceptNameFromOpenmrs } from './conceptResolver.js';
import { enrichPatientBioDataAndVisits } from './patientEnricher.js';

/**
 * Check if an identifier is voided in OpenMRS.
 * OpenMRS patient_identifier.voided column is 0 (active) or 1 (voided).
 * In REST API JSON, it can be boolean false/true, number 0/1, or string '0'/'1'.
 */
export function isIdentifierVoided(identifier: any): boolean {
  if (!identifier) return false;
  return (
    identifier.voided === true ||
    identifier.voided === 1 ||
    identifier.voided === '1' ||
    identifier.voided === 'true'
  );
}

export function extractPepfarIdFromIdentifiers(identifiers: any[]): string | null {
  if (!Array.isArray(identifiers) || identifiers.length === 0) return null;

  // STRICT REQUIREMENT: Only consider identifiers where the voided column is "0" (not voided).
  // In OpenMRS, if an ART Number for a patient was voided, its voided column is "1".
  // Only the active ART Number with voided = 0 must be selected.
  const activeIdentifiers = identifiers.filter((i: any) => !isIdentifierVoided(i));
  if (activeIdentifiers.length === 0) return null;

  // 1. Prioritize active (voided = 0) Identifier Type 4 / ART Number (Official Nigeria PEPFAR Identifier)
  const artOrPepfarList = activeIdentifiers.filter((i: any) => {
    const uuid = (i.identifierType?.uuid || '').toLowerCase();
    const name = (i.identifierType?.name || i.identifierType?.display || '').toLowerCase();
    const display = (i.display || '').toLowerCase();
    return (
      uuid === 'c82916e4-168c-495f-8ed0-b1b286c30a05' ||
      name === 'art number' ||
      name.includes('pepfar') ||
      name.includes('art no') ||
      name === 'art' ||
      display.includes('art number') ||
      display.includes('pepfar') ||
      i.identifierType?.id === 4
    );
  });

  if (artOrPepfarList.length > 0) {
    // If multiple active ART Numbers exist, prioritize the one marked preferred
    const preferredArt = artOrPepfarList.find((i: any) => i.preferred === true || i.preferred === 1 || i.preferred === 'true');
    if (preferredArt?.identifier) {
      return preferredArt.identifier.trim();
    }
    // Otherwise pick the latest unvoided ART Number (last in list)
    const activeArt = artOrPepfarList[artOrPepfarList.length - 1];
    if (activeArt?.identifier) {
      return activeArt.identifier.trim();
    }
  }

  // 2. Look for preferred unvoided identifier if not Hospital Number or OpenMRS ID
  const preferred = activeIdentifiers.find((i: any) => {
    if (!i.preferred) return false;
    const name = (i.identifierType?.name || i.identifierType?.display || '').toLowerCase();
    return !name.includes('hospital') && !name.includes('openmrs id') && !name.includes('old');
  });

  if (preferred?.identifier) {
    return preferred.identifier.trim();
  }

  return null;
}

export function extractHospitalNumberFromIdentifiers(identifiers: any[]): string | null {
  if (!Array.isArray(identifiers) || identifiers.length === 0) return null;
  // Filter out any voided identifiers (voided = 1)
  const activeIdentifiers = identifiers.filter((i: any) => !isIdentifierVoided(i));
  if (activeIdentifiers.length === 0) return null;

  const hosp = activeIdentifiers.find((i: any) => {
    const uuid = (i.identifierType?.uuid || '').toLowerCase();
    const name = (i.identifierType?.name || i.identifierType?.display || '').toLowerCase();
    const display = (i.display || '').toLowerCase();
    return uuid === 'fd0df06c-fcd4-4625-89b2-6b72ca44b8ed' || name.includes('hospital') || display.includes('hospital number');
  });
  return hosp?.identifier?.trim() || null;
}

/**
 * Extract structured bio data (Phone, NIN, State, LGA, NOK, Emergency Contact, Address)
 * from OpenMRS person attributes and addresses.
 */
export function extractBioDataFromPerson(person: any, identifiers: any[] = []) {
  const attributes = person?.attributes || [];
  const getAttr = (predicate: (name: string, uuid: string) => boolean) => {
    const attr = attributes.find((a: any) => {
      const typeName = (a.attributeType?.name || a.attributeType?.display || a.display || '').toLowerCase();
      const typeUuid = (a.attributeType?.uuid || '').toLowerCase();
      return predicate(typeName, typeUuid);
    });
    return attr?.value !== undefined ? String(attr.value).trim() : null;
  };

  // Phone
  const phone = getAttr((name) => name.includes('phone') || name.includes('telephone') || name.includes('mobile'));

  // NIN
  let nin = getAttr((name) => name.includes('nin') || name.includes('national id') || name.includes('identification'));
  if (!nin && Array.isArray(identifiers)) {
    const ninId = identifiers.find((i: any) => {
      const name = (i.identifierType?.name || i.identifierType?.display || '').toLowerCase();
      return name.includes('nin') || name.includes('national');
    });
    if (ninId?.identifier) nin = ninId.identifier.trim();
  }

  // State & LGA
  const stateOfOrigin = getAttr((name) => name.includes('state of origin') || name.includes('state')) || person?.addresses?.[0]?.stateProvince || null;
  const lga = getAttr((name) => name.includes('lga') || name.includes('local government')) || person?.addresses?.[0]?.cityVillage || null;

  // Next of Kin
  const nokName = getAttr((name) => name.includes('kin name') || name.includes('next of kin'));
  const nokPhone = getAttr((name) => name.includes('kin phone') || name.includes('kin contact'));
  const nokRelationship = getAttr((name) => name.includes('kin relationship') || name.includes('relationship'));
  const nokAddress = getAttr((name) => name.includes('kin address'));

  // Emergency contact
  const emergencyName = getAttr((name) => name.includes('emergency contact name') || name.includes('emergency name'));
  const emergencyPhone = getAttr((name) => name.includes('emergency phone') || name.includes('emergency contact phone'));
  const emergencyRelationship = getAttr((name) => name.includes('emergency relationship'));
  const emergencyAddress = getAttr((name) => name.includes('emergency address'));

  // Address
  const primaryAddress = person?.addresses?.[0];
  const addressLine = primaryAddress ? [primaryAddress.address1, primaryAddress.address2].filter(Boolean).join(' ') : null;
  const addressCity = primaryAddress?.cityVillage || lga || null;
  const addressState = primaryAddress?.stateProvince || stateOfOrigin || null;

  return {
    phone,
    nin,
    stateOfOrigin,
    lga,
    nokName,
    nokPhone,
    nokRelationship,
    nokAddress,
    emergencyName,
    emergencyPhone,
    emergencyRelationship,
    emergencyAddress,
    address: addressLine ? {
      line: addressLine,
      city: addressCity,
      state: addressState,
      country: primaryAddress?.country || 'Nigeria'
    } : null
  };
}

export interface NmrsConnectionStatus {
  connected: boolean;
  message: string;
  statusCode?: number;
  serverUrl?: string;
  latencyMs?: number;
  authenticatedUser?: string;
}

export class NmrsClient {
  private static async getActiveConfig() {
    let config = await prisma.nmrsConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      config = await prisma.nmrsConfig.create({
        data: {
          openmrsBaseUrl: 'http://localhost:8080/openmrs',
          openmrsUsername: 'admin',
          openmrsPassword: 'Admin123',
          facilityName: 'Faith Foundation Specialist Hospital',
          facilityDATIMCode: 'DATIM-NIG-7821',
          stateName: 'Benue',
          lgaName: 'Makurdi',
          autoSyncEnabled: true,
          ndrVersion: '1.6',
          isActive: true
        }
      });
    }

    return config;
  }

  private static async getHttpClient(customUrl?: string, customUser?: string, customPass?: string): Promise<{ client: AxiosInstance; baseUrl: string }> {
    const config = await this.getActiveConfig();
    let rawUrl = (customUrl || config.openmrsBaseUrl || 'http://localhost:8080/openmrs').trim().replace(/\/+$/, '');
    
    // Ensure protocol
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `http://${rawUrl}`;
    }

    // Strip trailing /ws/rest/v1 if user already included it
    rawUrl = rawUrl.replace(/\/ws\/rest\/v1\/?$/, '');

    // If no path is present, append /openmrs
    try {
      const parsed = new URL(rawUrl);
      if (!parsed.pathname || parsed.pathname === '/') {
        rawUrl = `${rawUrl}/openmrs`;
      }
    } catch {
      // Fallback
    }

    const username = (customUser !== undefined && customUser !== null ? customUser : config.openmrsUsername).trim();
    const password = (customPass !== undefined && customPass !== null ? customPass : config.openmrsPassword).trim();

    const client = axios.create({
      baseURL: `${rawUrl}/ws/rest/v1`,
      timeout: 10000,
      auth: {
        username,
        password
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return { client, baseUrl: rawUrl };
  }

  /**
   * Health-check / ping the remote NMRS OpenMRS server on the network
   */
  public static async testConnection(customUrl?: string, customUser?: string, customPass?: string): Promise<NmrsConnectionStatus> {
    const startTime = Date.now();
    try {
      const { client, baseUrl } = await this.getHttpClient(customUrl, customUser, customPass);
      const res = await client.get('/session');
      const latencyMs = Date.now() - startTime;

      if (res.data?.authenticated) {
        return {
          connected: true,
          message: `Successfully connected to OpenMRS server at ${baseUrl}`,
          statusCode: res.status,
          serverUrl: baseUrl,
          latencyMs,
          authenticatedUser: res.data?.user?.username || res.data?.user?.display || 'admin'
        };
      } else {
        return {
          connected: false,
          message: `Reachable at ${baseUrl}, but credentials invalid (Authentication Failed).`,
          statusCode: 401,
          serverUrl: baseUrl,
          latencyMs
        };
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      let errorMsg = 'Failed to connect to NMRS OpenMRS server.';

      if (err.code === 'ECONNREFUSED') {
        errorMsg = `Connection Refused: OpenMRS server is offline or unreachable at ${err.config?.baseURL || customUrl}. Verify the IP address & port of the host laptop on the hospital network.`;
      } else if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
        errorMsg = `Connection Timed Out: Host laptop did not respond in 8000ms. Check local hospital Wi-Fi/LAN connection and firewall rules.`;
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        errorMsg = `Authentication Failed (HTTP ${err.response.status}): Incorrect OpenMRS username or password.`;
      } else if (err.message) {
        errorMsg = `Network Error: ${err.message}`;
      }

      return {
        connected: false,
        message: errorMsg,
        statusCode: err.response?.status || 500,
        serverUrl: customUrl,
        latencyMs
      };
    }
  }

  /**
   * Search patient in remote OpenMRS by Identifier (PEPFAR ID or Hospital Number)
   */
  public static async searchRemotePatient(query: string) {
    try {
      const { client } = await this.getHttpClient();
      const res = await client.get(`/patient?q=${encodeURIComponent(query)}&v=custom:(uuid,identifiers:(identifier,preferred,voided,identifierType:(uuid,name,display)),person:(display,names:(givenName,familyName),gender,age,birthdate))`, {
        timeout: 8000
      });
      const raw = res.data?.results || [];
      return raw.map((r: any) => ({
        ...r,
        pepfarId: extractPepfarIdFromIdentifiers(r.identifiers),
        hospitalNumber: extractHospitalNumberFromIdentifiers(r.identifiers) || r.identifiers?.[0]?.identifier
      }));
    } catch (err: any) {
      console.warn(`[NMRS Client] Remote patient search failed (${err.message}). Returning empty list.`);
      return [];
    }
  }

  /**
   * Fetch complete patient historical encounters & observations from OpenMRS
   */
  public static async getRemotePatientEncounters(patientUuid: string) {
    try {
      const { client } = await this.getHttpClient();
      const res = await client.get(`/encounter?patient=${patientUuid}&v=custom:(uuid,encounterDatetime,encounterType:(uuid,name),location:(uuid,name),form:(uuid,name),obs:(uuid,obsDatetime,concept:(uuid,display,name:(name)),value,valueCoded:(uuid,display,name:(name)),valueNumeric,valueText,valueDatetime,groupMembers:(uuid,concept:(uuid,display,name:(name)),value,valueCoded:(uuid,display,name:(name)),valueNumeric,valueText)))`, {
        timeout: 10000
      });
      return res.data?.results || [];
    } catch (err: any) {
      console.warn(`[NMRS Client] Remote encounter fetch failed (${err.message}).`);
      return [];
    }
  }

  /**
   * Ingest complete historical encounters, visits and bio data with human-readable concept names.
   */
  public static async ingestRemotePatientEncountersAndBioData(
    patientId: string,
    openmrsUuid?: string | null,
    remoteBioData?: any
  ) {
    // 1. If remoteBioData provided, update patient bio data
    if (remoteBioData) {
      const updateData: any = {};
      if (remoteBioData.nin) updateData.nin = remoteBioData.nin;
      if (remoteBioData.stateOfOrigin) updateData.stateOfOrigin = remoteBioData.stateOfOrigin;
      if (remoteBioData.lga) updateData.lga = remoteBioData.lga;
      if (remoteBioData.nokName) updateData.nokName = remoteBioData.nokName;
      if (remoteBioData.nokPhone) updateData.nokPhone = remoteBioData.nokPhone;
      if (remoteBioData.nokRelationship) updateData.nokRelationship = remoteBioData.nokRelationship;
      if (remoteBioData.nokAddress) updateData.nokAddress = remoteBioData.nokAddress;
      if (remoteBioData.emergencyName) updateData.emergencyName = remoteBioData.emergencyName;
      if (remoteBioData.emergencyPhone) updateData.emergencyPhone = remoteBioData.emergencyPhone;
      if (remoteBioData.emergencyRelationship) updateData.emergencyRelationship = remoteBioData.emergencyRelationship;
      if (remoteBioData.emergencyAddress) updateData.emergencyAddress = remoteBioData.emergencyAddress;

      if (Object.keys(updateData).length > 0) {
        await prisma.patient.update({
          where: { id: patientId },
          data: updateData
        });
      }

      if (remoteBioData.address) {
        const existingAddr = await prisma.patientAddress.findFirst({ where: { patientId } });
        if (!existingAddr) {
          await prisma.patientAddress.create({
            data: {
              patientId,
              line: remoteBioData.address.line,
              city: remoteBioData.address.city,
              state: remoteBioData.address.state,
              country: remoteBioData.address.country || 'Nigeria',
              use: 'home' as any
            }
          });
        }
      }

      if (remoteBioData.phone) {
        const existingPhone = await prisma.patientTelecom.findFirst({
          where: { patientId, system: 'phone' }
        });
        if (!existingPhone) {
          await prisma.patientTelecom.create({
            data: {
              patientId,
              system: 'phone' as any,
              value: remoteBioData.phone,
              use: 'mobile' as any
            }
          });
        }
      }
    }

    // 2. Fetch live encounters from OpenMRS if uuid is available
    if (openmrsUuid) {
      const encounters = await this.getRemotePatientEncounters(openmrsUuid);
      if (encounters && encounters.length > 0) {
        for (const enc of encounters) {
          const encDate = enc.encounterDatetime ? new Date(enc.encounterDatetime) : new Date();
          const typeName = enc.encounterType?.name || 'Clinical Encounter';
          const formName = enc.form?.name || typeName;

          // Build dictionary of resolved concept names and resolved values
          const obsDict: Record<string, any> = {};
          const obsList = enc.obs || [];

          for (const o of obsList) {
            const conceptName = resolveConceptName(o.concept, o.concept?.id);
            const obsVal = resolveObsValue(o);
            obsDict[conceptName] = obsVal;
          }

          // Find or create Visit
          let visit = await prisma.visit.findFirst({
            where: {
              patientId,
              createdAt: {
                gte: new Date(encDate.getTime() - 12 * 3600 * 1000),
                lte: new Date(encDate.getTime() + 12 * 3600 * 1000)
              }
            }
          });

          if (!visit) {
            visit = await prisma.visit.create({
              data: {
                visitNumber: `VIS-NMRS-${encDate.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
                patientId,
                visitType: typeName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30),
                status: 'COMPLETED',
                createdAt: encDate,
                updatedAt: encDate,
                chiefComplaint: `${formName} (${typeName})`
              }
            });
          }

          // Create Encounter
          const encounterRecord = await prisma.encounter.create({
            data: {
              fhirId: `enc_${enc.uuid || Math.random().toString(36).slice(2, 10)}`,
              patientId,
              visitId: visit.id,
              status: 'FINISHED' as any,
              class: 'AMBULATORY' as any,
              type: typeName,
              serviceType: formName,
              start: encDate,
              end: encDate,
              reasonText: `${formName} synchronized from OpenMRS NMRS`,
              diagnosis: obsDict
            }
          });

          // Create individual observation records
          for (const [cName, cVal] of Object.entries(obsDict)) {
            await prisma.observation.create({
              data: {
                fhirId: `obs_${encounterRecord.id.slice(0, 8)}_${cName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
                patientId,
                encounterId: encounterRecord.id,
                status: 'FINAL' as any,
                category: 'EXAM',
                code: cName,
                display: cName,
                valueString: String(cVal),
                effectiveDateTime: encDate
              }
            });
          }
        }
        return;
      }
    }

    // 3. Fallback to patient enricher if OpenMRS has no live encounters or is unreachable
    await enrichPatientBioDataAndVisits(patientId);
  }

  /**
   * Fetch all patients from remote OpenMRS server
   */
  public static async fetchAllRemotePatients(): Promise<any[]> {
    const allFetched: any[] = [];
    try {
      const { client } = await this.getHttpClient();

      // Probe connectivity with 3s timeout before running multi-query remote search
      try {
        await client.get('/session', { timeout: 3000 });
      } catch (pingErr: any) {
        console.warn(`[NMRS Client] OpenMRS host offline or unreachable on LAN (${pingErr.message}). Skipping remote queries.`);
        return [];
      }

      // Nigerian OpenMRS / NMRS prefixes (Lucene requires queries >= 2 characters)
      const prefixes = [
        'IMO', 'OGW', 'WIS',
        '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
        'CH', 'OK', 'NW', 'EZ', 'OB', 'UG', 'AM', 'EM', 'JO', 'MA', 'PA', 'SU', 'JA', 'TE'
      ];
      const seenUuids = new Set<string>();

      for (const prefix of prefixes) {
        let startIndex = 0;
        const maxPages = 20; // Up to 2,000 patients per prefix (e.g. IMO prefix has 928)
        let pageCount = 0;

        while (pageCount < maxPages) {
          pageCount++;
          try {
            const res = await client.get('/patient', {
              params: {
                q: prefix,
                limit: 100,
                startIndex,
                v: 'custom:(uuid,display,identifiers:(identifier,preferred,voided,identifierType:(uuid,name,display)),person:(uuid,display,gender,age,birthdate,names:(givenName,middleName,familyName),addresses:(preferred,address1,address2,cityVillage,stateProvince,country,postalCode),attributes:(uuid,display,value,attributeType:(uuid,name,display))))'
              },
              timeout: 10000
            });
            const results = res.data?.results || [];
            if (results.length === 0) break;

            for (const r of results) {
              if (seenUuids.has(r.uuid)) continue;
              seenUuids.add(r.uuid);

              const pepfarId = extractPepfarIdFromIdentifiers(r.identifiers);
              const hospitalNumber = extractHospitalNumberFromIdentifiers(r.identifiers) || r.identifiers?.[0]?.identifier || `NMRS-${r.uuid.slice(0, 6)}`;
              const bioData = extractBioDataFromPerson(r.person, r.identifiers);

              allFetched.push({
                openmrsUuid: r.uuid,
                firstName: r.person?.names?.[0]?.givenName || r.person?.display?.split(' ')?.[0] || 'NMRS',
                lastName: r.person?.names?.[0]?.familyName || r.person?.display?.split(' ')?.[1] || 'Patient',
                gender: r.person?.gender === 'F' ? 'FEMALE' : 'MALE',
                birthDate: r.person?.birthdate || '1992-06-15',
                hospitalNumber,
                pepfarId: pepfarId || null,
                nin: bioData.nin,
                bioData,
                currentRegimen: '1a: TDF + 3TC + DTG',
                lastViralLoad: 0,
                lastCd4Count: 520,
                whoClinicalStage: 'STAGE_1'
              });
            }

            // If fewer than 100 results were returned, there are no more pages for this prefix
            if (results.length < 100) break;
            startIndex += 100;
          } catch {
            break;
          }
        }
      }

      if (allFetched.length > 0) {
        return allFetched;
      }
    } catch (err: any) {
      console.warn(`[NMRS Client] Remote patient fetch from OpenMRS host: ${err.message}`);
    }

    return allFetched;
  }

  /**
   * Create or Sync Patient to OpenMRS
   */
  public static async syncPatientToOpenmrs(patientData: {
    firstName: string;
    lastName: string;
    gender: string;
    birthDate: string;
    hospitalNumber: string;
    pepfarId?: string;
  }) {
    try {
      const { client } = await this.getHttpClient();

      const identifiers: any[] = [
        {
          identifier: patientData.hospitalNumber,
          identifierType: 'fd0df06c-fcd4-4625-89b2-6b72ca44b8ed', // Hospital Number Type UUID
          preferred: !patientData.pepfarId
        }
      ];

      // Add Identifier Type 4 (ART Number / PEPFAR Unique ID)
      if (patientData.pepfarId) {
        identifiers.push({
          identifier: patientData.pepfarId,
          identifierType: 'c82916e4-168c-495f-8ed0-b1b286c30a05', // Official Nigeria ART Number (Type 4) UUID
          preferred: true
        });
      }

      const payload = {
        person: {
          names: [
            {
              givenName: patientData.firstName,
              familyName: patientData.lastName,
              preferred: true
            }
          ],
          gender: patientData.gender === 'FEMALE' ? 'F' : 'M',
          birthdate: patientData.birthDate
        },
        identifiers
      };

      const res = await client.post('/patient', payload, { timeout: 10000 });
      return {
        success: true,
        openmrsUuid: res.data?.uuid,
        response: res.data
      };
    } catch (err: any) {
      console.warn(`[NMRS Client] Direct OpenMRS patient create failed (${err.message}). Queueing locally.`);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Update or reassign ART Number (Identifier Type 4) for an existing OpenMRS patient.
   * Ensures:
   * 1. Existing ART Numbers on OpenMRS are voided (voided column = 1).
   * 2. The new ART Number is created with preferred = true (voided column = 0).
   * 3. The OpenMRS patient_id and patient UUID remain completely unchanged.
   */
  public static async updateOpenmrsPatientArtNumber(openmrsUuid: string, newArtNumber: string) {
    try {
      const { client } = await this.getHttpClient();

      // 1. Fetch existing identifiers for this patient from OpenMRS
      const res = await client.get(`/patient/${openmrsUuid}/identifier?v=full`, { timeout: 8000 });
      const existingIdentifiers = res.data?.results || [];

      // 2. Identify any active ART Number (Identifier Type 4)
      const ART_TYPE_UUID = 'c82916e4-168c-495f-8ed0-b1b286c30a05';
      const existingArtList = existingIdentifiers.filter((i: any) => {
        const typeUuid = (i.identifierType?.uuid || '').toLowerCase();
        const typeName = (i.identifierType?.name || '').toLowerCase();
        const matchesArt = typeUuid === ART_TYPE_UUID || typeName === 'art number' || typeName.includes('art no');
        const isVoided = i.voided === true || i.voided === 1 || i.voided === '1' || i.voided === 'true';
        return matchesArt && !isVoided;
      });

      // 3. Void existing active ART numbers on OpenMRS so voided column becomes 1
      for (const oldArt of existingArtList) {
        if (oldArt.identifier?.trim() === newArtNumber.trim()) {
          // Already active with the exact same identifier (voided = 0)
          return { success: true, openmrsUuid, identifier: newArtNumber.trim() };
        }
        try {
          await client.delete(`/patient/${openmrsUuid}/identifier/${oldArt.uuid}?reason=Updated+ART+Number`, { timeout: 8000 });
        } catch (e: any) {
          console.warn(`[NMRS Client] Failed to void old ART number ${oldArt.uuid}: ${e.message}`);
        }
      }

      // 4. Create new ART Number identifier on OpenMRS with voided = 0
      let defaultLocation = '8d6c993e-c2cc-11de-8d13-0010c6dffd0f';
      try {
        const locRes = await client.get('/location?q=Outpatient&limit=1', { timeout: 5000 });
        if (locRes.data?.results?.[0]?.uuid) {
          defaultLocation = locRes.data.results[0].uuid;
        }
      } catch {}

      const postRes = await client.post(`/patient/${openmrsUuid}/identifier`, {
        identifier: newArtNumber.trim(),
        identifierType: ART_TYPE_UUID,
        preferred: true,
        location: defaultLocation
      }, { timeout: 10000 });

      return {
        success: true,
        openmrsUuid,
        identifier: newArtNumber.trim(),
        identifierUuid: postRes.data?.uuid
      };
    } catch (err: any) {
      console.warn(`[NMRS Client] Remote OpenMRS ART number update failed (${err.message}). Local record preserved.`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Post Encounter with Observations to OpenMRS
   */
  public static async postEncounterToOpenmrs(encounterData: {
    patientUuid: string;
    encounterTypeUuid?: string;
    encounterDatetime: string;
    observations: Array<{ concept: string | number; value: any }>;
  }) {
    try {
      const { client } = await this.getHttpClient();

      const payload = {
        patient: encounterData.patientUuid,
        encounterType: encounterData.encounterTypeUuid || '8d5b8c56-c2cc-11de-8d13-0010c6dffd0f', // Adult Initial or Care Card UUID
        encounterDatetime: encounterData.encounterDatetime,
        obs: encounterData.observations.map(o => ({
          concept: o.concept.toString(),
          value: o.value
        }))
      };

      const res = await client.post('/encounter', payload, { timeout: 10000 });
      return {
        success: true,
        encounterUuid: res.data?.uuid,
        response: res.data
      };
    } catch (err: any) {
      console.warn(`[NMRS Client] Direct OpenMRS encounter post failed (${err.message}).`);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Pull and synchronize all official Form Schemas from OpenMRS CLOB database storage
   */
  public static async pullAllRemoteForms(): Promise<{ totalRemote: number; imported: number; updated: number; forms: any[] }> {
    let imported = 0;
    let updated = 0;
    const processedList: any[] = [];

    try {
      const { client } = await this.getHttpClient();

      // Probe connectivity with 3s timeout before running full form fetch
      try {
        await client.get('/session', { timeout: 3000 });
      } catch (pingErr: any) {
        console.warn(`[NMRS Client] OpenMRS host offline during form pull (${pingErr.message}). Returning pre-seeded schemas.`);
        const localSchemas = await prisma.nmrsFormSchema.findMany();
        return { totalRemote: localSchemas.length, imported: 0, updated: 0, forms: localSchemas };
      }

      // Fetch forms with resources info
      const res = await client.get('/form?v=custom:(uuid,name,description,version,retired,resources:(uuid,name,valueReference,dataType))', {
        timeout: 12000
      });
      const remoteForms = res.data?.results || [];

      for (let i = 0; i < remoteForms.length; i++) {
        const rf = remoteForms[i];
        let formCode = rf.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        if (formCode.length > 40) formCode = formCode.slice(0, 40);
        if (!formCode) formCode = `NMRS_FORM_${i + 1}`;

        const nameLower = rf.name.toLowerCase();
        let category = 'HIV_PROGRAM';
        if (nameLower.includes('pmtct') || nameLower.includes('mother infant') || nameLower.includes('child birth') || nameLower.includes('antenatal') || nameLower.includes('delivery')) category = 'PMTCT_ANC';
        else if (nameLower.includes('tb') || nameLower.includes('tuberculosis') || nameLower.includes('ipt') || nameLower.includes('dr-tb')) category = 'TB_PROGRAM';
        else if (nameLower.includes('pharmacy') || nameLower.includes('drug') || nameLower.includes('refill') || nameLower.includes('adr')) category = 'PHARMACY';
        else if (nameLower.includes('lab') || nameLower.includes('viral load') || nameLower.includes('specimen') || nameLower.includes('recency')) category = 'LAB';
        else if (nameLower.includes('prep') || nameLower.includes('pep')) category = 'PREP_PEP';
        else if (nameLower.includes('hts') || nameLower.includes('testing') || nameLower.includes('index contact') || nameLower.includes('risk')) category = 'HTS_TESTING';
        else if (nameLower.includes('eac') || nameLower.includes('counselling') || nameLower.includes('tracking') || nameLower.includes('otz')) category = 'CARE_SUPPORT';

        // Check if this form has a CLOB JSON schema resource
        let clobSchema: any = null;
        const jsonResource = rf.resources?.find((r: any) => r.name === 'JSON schema' || r.dataType === 'AmpathJsonSchema') || rf.resources?.[0];

        if (jsonResource?.valueReference) {
          try {
            const clobRes = await client.get(`/clobdata/${jsonResource.valueReference}`, { timeout: 6000 });
            if (clobRes.data && (typeof clobRes.data === 'object' || typeof clobRes.data === 'string')) {
              clobSchema = typeof clobRes.data === 'string' ? JSON.parse(clobRes.data) : clobRes.data;
            }
          } catch {
            // CLOB fetch timed out or unavailable, will fallback
          }
        }

        // Fallback to built-in matching schema if available
        if (!clobSchema) {
          const lowerName = rf.name.toLowerCase().trim();
          const matchDefault = DEFAULT_NMRS_SCHEMAS.find(d => {
            const dLower = d.formName.toLowerCase();
            return (
              d.openmrsFormUuid === rf.uuid ||
              d.formCode === formCode ||
              dLower === lowerName ||
              dLower.includes(lowerName) ||
              lowerName.includes(dLower) ||
              (lowerName.includes('intake') && d.formCode === 'CLIENT_INTAKE_FORM') ||
              (lowerName.includes('hts') && (d.formCode === 'HTS_REGISTER' || d.formCode === 'CLIENT_INTAKE_FORM')) ||
              (lowerName.includes('care card') && d.formCode === 'CARE_CARD_MASTER') ||
              (lowerName.includes('adult') && lowerName.includes('initial') && d.formCode === 'CARE_CARD_4B') ||
              (lowerName.includes('pharmacy') && d.formCode === 'PHARMACY_ORDER') ||
              (lowerName.includes('lab') && d.formCode === 'INTEGRATED_LAB_ORDER')
            );
          });
          if (matchDefault) {
            clobSchema = matchDefault;
          }
        }

        // If still no schema, build a standardized CLOB-compliant structure
        if (!clobSchema) {
          clobSchema = {
            name: rf.name,
            title: rf.name,
            category,
            version: rf.version || '1.0',
            description: rf.description || `${rf.name} official national form specification.`,
            openmrsFormUuid: rf.uuid,
            pages: [
              {
                label: `${rf.name} (Page 1)`,
                sections: [
                  {
                    id: 'encounter_header',
                    title: 'Encounter & Facility Metadata',
                    label: 'Encounter & Facility Metadata',
                    questions: [
                      { id: 'encounterDate', label: 'Encounter Date', type: 'control', required: true, questionOptions: { rendering: 'date' } },
                      { id: 'facilityName', label: 'Facility Name', type: 'control', defaultValue: 'Faith Foundation Specialist Hospital', questionOptions: { rendering: 'text' } },
                      { id: 'clinicianName', label: 'Clinician / Provider Name', type: 'control', required: true, questionOptions: { rendering: 'text' } }
                    ]
                  },
                  {
                    id: 'clinical_observations',
                    title: 'Clinical Observations & Evaluation',
                    label: 'Clinical Observations & Evaluation',
                    questions: [
                      {
                        id: 'visitType',
                        label: 'Visit Type',
                        type: 'obs',
                        questionOptions: {
                          rendering: 'select',
                          answers: [
                            { label: 'Routine / Scheduled Visit', concept: '1' },
                            { label: 'Unscheduled / Acute Illness', concept: '2' },
                            { label: 'Pharmacy Drug Refill Only', concept: '3' }
                          ]
                        }
                      },
                      { id: 'weightKg', label: 'Weight (kg)', type: 'obs', conceptId: 5089, questionOptions: { rendering: 'number', concept: '5089' } },
                      { id: 'bloodPressure', label: 'Blood Pressure (mmHg)', type: 'obs', conceptId: 5085, questionOptions: { rendering: 'text', concept: '5085' } },
                      {
                        id: 'clinicalStage',
                        label: 'WHO Clinical Stage',
                        type: 'obs',
                        conceptId: 5356,
                        questionOptions: {
                          rendering: 'select',
                          concept: '5356',
                          answers: [
                            { label: 'Stage 1 (Asymptomatic)', concept: '1204' },
                            { label: 'Stage 2 (Mild Symptoms)', concept: '1205' },
                            { label: 'Stage 3 (Advanced Symptoms)', concept: '1206' },
                            { label: 'Stage 4 (Severe / AIDS)', concept: '1207' }
                          ]
                        }
                      },
                      {
                        id: 'arvRegimen',
                        label: 'Current ARV Regimen',
                        type: 'obs',
                        conceptId: 164506,
                        questionOptions: {
                          rendering: 'select',
                          concept: '164506',
                          answers: [
                            { label: '1a: TDF + 3TC + DTG', concept: '165681' },
                            { label: '1b: TDF + 3TC + EFV', concept: '165682' },
                            { label: '2a: AZT + 3TC + ATV/r', concept: '165688' },
                            { label: '2b: TDF + 3TC + LPV/r', concept: '165690' }
                          ]
                        }
                      },
                      { id: 'generalRemarks', label: 'Clinical Assessment & Action Plan', type: 'obs', conceptId: 160716, questionOptions: { rendering: 'textarea', concept: '160716' } },
                      { id: 'nextAppointmentDate', label: 'Next Appointment / Refill Date', type: 'obs', conceptId: 5096, questionOptions: { rendering: 'date', concept: '5096' } }
                    ]
                  }
                ]
              }
            ]
          };
        }

        // Ensure both pages and direct sections exist for backward and forward compatibility
        if (clobSchema.pages && !clobSchema.sections) {
          clobSchema.sections = clobSchema.pages.flatMap((p: any) => p.sections || []);
        }

        const existing = await prisma.nmrsFormSchema.findFirst({
          where: {
            OR: [
              { openmrsFormUuid: rf.uuid },
              { formCode: formCode }
            ]
          }
        });

        if (existing) {
          await prisma.nmrsFormSchema.update({
            where: { id: existing.id },
            data: {
              formName: rf.name,
              openmrsFormUuid: rf.uuid,
              category,
              version: rf.version || '1.0',
              description: rf.description || `${rf.name} national form specification.`,
              schemaJson: clobSchema as any,
              isActive: !rf.retired
            }
          });
          updated++;
        } else {
          await prisma.nmrsFormSchema.create({
            data: {
              formCode,
              formName: rf.name,
              openmrsFormUuid: rf.uuid,
              category,
              version: rf.version || '1.0',
              description: rf.description || `${rf.name} national form specification.`,
              schemaJson: clobSchema as any,
              isActive: !rf.retired
            }
          });
          imported++;
        }

        processedList.push({
          formCode,
          formName: rf.name,
          category,
          uuid: rf.uuid
        });
      }

      return {
        totalRemote: remoteForms.length,
        imported,
        updated,
        forms: processedList
      };
    } catch (err: any) {
      console.warn(`[NMRS Client] Remote OpenMRS form sync encountered issue (${err.message}). Ensuring all default national CLOB schemas are seeded.`);
      // Ensure all DEFAULT_NMRS_SCHEMAS are seeded in PostgreSQL
      for (const def of DEFAULT_NMRS_SCHEMAS) {
        const existing = await prisma.nmrsFormSchema.findFirst({
          where: { formCode: def.formCode }
        });
        if (existing) {
          await prisma.nmrsFormSchema.update({
            where: { id: existing.id },
            data: {
              formName: def.formName,
              description: def.description,
              category: def.category,
              version: def.version,
              openmrsFormUuid: def.openmrsFormUuid,
              schemaJson: def as any,
              isActive: true
            }
          });
          updated++;
        } else {
          await prisma.nmrsFormSchema.create({
            data: {
              formCode: def.formCode,
              formName: def.formName,
              description: def.description,
              category: def.category,
              version: def.version,
              openmrsFormUuid: def.openmrsFormUuid,
              schemaJson: def as any,
              isActive: true
            }
          });
          imported++;
        }
        processedList.push({
          formCode: def.formCode,
          formName: def.formName,
          category: def.category,
          uuid: def.openmrsFormUuid
        });
      }

      return {
        totalRemote: DEFAULT_NMRS_SCHEMAS.length,
        imported,
        updated,
        forms: processedList
      };
    }
  }
}

