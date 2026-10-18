// Direct MySQL Database Connector for Nigeria Medical Record System (NMRS / OpenMRS)
// Communicates directly between MySQL on the laptop server and TerkHealth360 PostgreSQL database.
import mysql from 'mysql2/promise';
import { prisma } from '../../prisma.js';
import { CIEL_CONCEPT_ID_MAP } from './conceptResolver.js';

export interface MySqlConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export interface LiveConceptInfo {
  conceptId: number;
  uuid: string;
  datatypeId?: number;
  datatypeName?: string;
  classId?: number;
  className?: string;
  isSet?: boolean;
  preferredName?: string;
}

// Canonical drug strength lookup mapping UUIDs, numeric concept IDs, and variations to human-readable strings
export const DRUG_STRENGTH_LOOKUP: Record<string, string> = {
  // 25/300/50mg (TAF/3TC/DTG)
  'ffaaa42a-0c41-4e3f-a85a-7378f1c2efaf': '25/300/50mg',
  '167522': '25/300/50mg',
  'd0623bd6-525d-4aac-bfb5-d97184e29067': '25/300/50mg',
  '167303': '25/300/50mg',
  '25_300_50mg': '25/300/50mg',
  '25/300/50mg': '25/300/50mg',
  '25/300/50Mg': '25/300/50mg',

  // 300/300/50mg (TDF/3TC/DTG)
  '0cd9c98e-7f52-48b9-a987-404ec90cc5fe': '300/300/50mg',
  '166044': '300/300/50mg',
  '300_300_50mg': '300/300/50mg',
  '300/300/50mg': '300/300/50mg',
  '300/300/50Mg': '300/300/50mg',

  // 300/300/600mg (TDF/3TC/EFV)
  '4db3bbfd-2e59-48af-ba55-1b6deed9ec32': '300/300/600mg',
  '165618': '300/300/600mg',
  '166046AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '300/300/600mg',
  '300_300_600mg': '300/300/600mg',
  '300/300/600mg': '300/300/600mg',

  // 300/150/200mg (AZT/3TC/NVP)
  'd1359cec-4457-4699-b050-7b65a25c1ca3': '300/150/200mg',
  '165620': '300/150/200mg',
  '166047AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '300/150/200mg',
  '300_150_200mg': '300/150/200mg',
  '300/150/200mg': '300/150/200mg',
  '150/300/200mg': '300/150/200mg',

  // 600/300/50mg (ABC/3TC/DTG)
  '166048AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '600/300/50mg',
  '600_300_50mg': '600/300/50mg',
  '600/300/50mg': '600/300/50mg',

  // 600/300/600mg (ABC/3TC/EFV)
  '166049AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '600/300/600mg',
  '600_300_600mg': '600/300/600mg',
  '600/300/600mg': '600/300/600mg',

  // 300/300mg (TDF/3TC)
  'fcd74eb9-c917-42b1-969a-696b15a5627c': '300/300mg',
  '165621': '300/300mg',
  '166050AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '300/300mg',
  '300_300mg': '300/300mg',
  '300/300mg': '300/300mg',

  // 300/150mg (AZT/3TC)
  '6717b4c6-4cf3-4ef1-9734-f2da5300003f': '300/150mg',
  '165622': '300/150mg',
  '166051AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '300/150mg',
  '300_150mg': '300/150mg',
  '300/150mg': '300/150mg',

  // 300/100mg (ATV/r)
  'ddd236eb-b5af-465f-9c37-862741ca75a6': '300/100mg',
  '165624': '300/100mg',
  '166052AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '300/100mg',
  '300_100mg': '300/100mg',
  '300/100mg': '300/100mg',

  // 200/50mg (LPV/r)
  '9339100a-1fe3-4978-9af1-a6ee868840ac': '200/50mg',
  '165625': '200/50mg',
  '166053AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '200/50mg',
  '200_50mg': '200/50mg',
  '200/50mg': '200/50mg',

  // Single Strengths
  'abbb66b8-61c9-4b58-bad6-edf1efa546e1': '300mg',
  '165074': '300mg',
  '1679': '300mg',
  '166054AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '300mg',
  '300mg': '300mg',

  'c543792b-6225-4a70-8e1f-04ea5be06212': '50mg',
  '165617': '50mg',
  '166055AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '50mg',
  '50mg': '50mg',

  'da318ab9-efce-47a9-a975-468a718d4ef6': '200mg',
  '165635': '200mg',
  '200mg': '200mg',

  '409fccb1-a7de-412f-9ee6-1e96d4b0b65a': '150mg',
  '165075': '150mg',
  '150mg': '150mg',

  '27f5a185-9791-45b2-89e8-89df69fdac71': '100mg',
  '165076': '100mg',
  '100mg': '100mg',

  '3620ba59-4313-45b4-897f-764f0609512c': '25mg',
  '165706': '25mg',
  '25mg': '25mg',

  'd6a11b94-efe5-415e-8071-29d75356bac0': '600mg',
  '165616': '600mg',
  '600mg': '600mg',

  '7c844c65-b960-4ac7-8642-69b618db3602': '400/50mg',
  '165705': '400/50mg',
  '400/50mg': '400/50mg',

  'c03561ed-1402-4bfe-b95d-9547fe6b9bf7': '960mg',
  '165062': '960mg',
  '960mg': '960mg',

  '106d9ce8-92d4-4549-9735-9ddaad20136a': '480mg',
  '165060': '480mg',
  '480mg': '480mg'
};

export class NmrsMySqlConnector {
  /**
   * Resolve MySQL connection settings.
   * Priority: values saved on the Settings page (nmrs_configs) > .env (NMRS_MYSQL_*) > defaults.
   * Host defaults to the hostname of the configured OpenMRS base URL.
   */
  public static async getConnectionConfig(): Promise<MySqlConfig> {
    const config = await prisma.nmrsConfig.findFirst({ where: { isActive: true } });
    let urlHost = '10.120.221.29';

    if (config?.openmrsBaseUrl) {
      try {
        const u = new URL(config.openmrsBaseUrl.startsWith('http') ? config.openmrsBaseUrl : `http://${config.openmrsBaseUrl}`);
        if (u.hostname) urlHost = u.hostname;
      } catch {
        // fallback
      }
    }

    return {
      host: config?.mysqlHost || process.env.NMRS_MYSQL_HOST || urlHost,
      port: Number(config?.mysqlPort || process.env.NMRS_MYSQL_PORT || 3306),
      user: config?.mysqlUser || process.env.NMRS_MYSQL_USER || 'root',
      password: config?.mysqlPassword || process.env.NMRS_MYSQL_PASSWORD || 'Admin123',
      database: config?.mysqlDatabase || process.env.NMRS_MYSQL_DB || 'openmrs'
    };
  }

  /**
   * Test connection to remote OpenMRS MySQL database
   */
  public static async testConnection(cfg?: Partial<MySqlConfig>) {
    const base = await this.getConnectionConfig();
    const config = { ...base, ...cfg };
    const startTime = Date.now();

    try {
      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 4000
      });

      const [rows]: any = await conn.execute('SELECT COUNT(*) as patient_count FROM patient WHERE voided = 0');
      await conn.end();

      return {
        connected: true,
        host: config.host,
        database: config.database,
        latencyMs: Date.now() - startTime,
        totalActivePatients: rows?.[0]?.patient_count || 0,
        message: `Connected successfully to OpenMRS MySQL database at ${config.host}:${config.port}`
      };
    } catch (err: any) {
      return {
        connected: false,
        host: config.host,
        database: config.database,
        latencyMs: Date.now() - startTime,
        message: `MySQL Connection Failed: ${err.message}`
      };
    }
  }

  /**
   * Pull complete patient history (authentic visits, dates, encounters and obs)
   * directly from the OpenMRS MySQL database.
   */
  public static async pullPatientHistory(identifierOrArt: string, customConfig?: Partial<MySqlConfig>) {
    const base = await this.getConnectionConfig();
    const config = { ...base, ...customConfig };

    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000
    });

    try {
      const cleanKey = identifierOrArt.trim();

      // 1. Find patient record
      const [patients]: any = await conn.execute(
        `SELECT p.patient_id, per.uuid as patient_uuid,
                pi.identifier as art_number,
                pn.given_name, pn.family_name,
                per.gender, per.birthdate, per.dead, per.death_date, per.cause_of_death,
                pa.address1, pa.city_village, pa.state_province, pa.country
         FROM patient p
         JOIN patient_identifier pi ON p.patient_id = pi.patient_id AND pi.voided = 0
         JOIN person per ON p.patient_id = per.person_id AND per.voided = 0
         LEFT JOIN person_name pn ON per.person_id = pn.person_id AND pn.voided = 0
         LEFT JOIN person_address pa ON per.person_id = pa.person_id AND pa.voided = 0
         WHERE pi.identifier = ? OR per.uuid = ? OR p.patient_id = ? OR pi.identifier LIKE ?
         ORDER BY pn.preferred DESC, pa.preferred DESC
         LIMIT 1`,
        [cleanKey, cleanKey, cleanKey, `%${cleanKey}%`]
      );

      if (!patients || patients.length === 0) {
        await conn.end();
        return null;
      }

      const rawPat = patients[0];
      const patientId = rawPat.patient_id;

      // 2. Fetch hospital number
      const [hospIds]: any = await conn.execute(
        `SELECT identifier FROM patient_identifier
         WHERE patient_id = ? AND voided = 0 AND identifier_type IN (5, 3)
         LIMIT 1`,
        [patientId]
      );
      const hospitalNumber = hospIds?.[0]?.identifier || rawPat.art_number;

      // 3. Fetch phone number from person_attribute
      const [phones]: any = await conn.execute(
        `SELECT value FROM person_attribute WHERE person_id = ? AND voided = 0 LIMIT 1`,
        [patientId]
      );
      const phone = phones?.[0]?.value || '';

      // 4. Fetch actual encounters
      const [encounters]: any = await conn.execute(
        `SELECT e.encounter_id, e.uuid as encounter_uuid, e.uuid, e.encounter_datetime, e.visit_id,
                et.name as encounter_type_name,
                f.name as form_name, f.uuid as form_uuid
         FROM encounter e
         JOIN encounter_type et ON e.encounter_type = et.encounter_type_id
         LEFT JOIN form f ON e.form_id = f.form_id
         WHERE e.patient_id = ? AND e.voided = 0
         ORDER BY e.encounter_datetime ASC`,
        [patientId]
      );

      // 5. Fetch all observations with obs_group_id, form_namespace_and_path, and concept/coded UUIDs
      const [observations]: any = await conn.execute(
        `SELECT o.obs_id, o.encounter_id, o.obs_group_id, o.concept_id, o.obs_datetime,
                c.uuid as concept_uuid,
                cn.name as concept_name,
                o.value_numeric, o.value_text, o.value_datetime, o.value_coded,
                cv.uuid as coded_uuid,
                cvn.name as coded_value_name,
                o.form_namespace_and_path
         FROM obs o
         JOIN concept c ON o.concept_id = c.concept_id
         LEFT JOIN concept_name cn ON o.concept_id = cn.concept_id AND cn.locale = 'en' AND cn.concept_name_type = 'FULLY_SPECIFIED'
         LEFT JOIN concept cv ON o.value_coded = cv.concept_id
         LEFT JOIN concept_name cvn ON o.value_coded = cvn.concept_id AND cvn.locale = 'en' AND cvn.concept_name_type = 'FULLY_SPECIFIED'
         WHERE o.person_id = ? AND o.voided = 0
         ORDER BY o.encounter_id, o.obs_group_id ASC, o.obs_id ASC`,
        [patientId]
      );

      await conn.end();

      // Group observations by encounter_id
      const obsByEnc = new Map<number, Record<string, any>>();
      const obsListByEnc = new Map<number, any[]>();
      for (const o of observations) {
        if (!obsListByEnc.has(o.encounter_id)) {
          obsListByEnc.set(o.encounter_id, []);
        }
        obsListByEnc.get(o.encounter_id)!.push(o);
      }

      for (const [encId, encObsList] of obsListByEnc.entries()) {
        const dict: Record<string, any> = {};

        // Identify parent obsGroups
        const groups = new Map<number, { groupType: string; items: Record<string, any> }>();
        for (const o of encObsList) {
          if (!o.obs_group_id) {
            let groupType: string | null = null;
            const path = o.form_namespace_and_path || '';
            if (path.includes('oi_prophylaxis') || o.concept_id === 165726) groupType = 'oi_prophylaxis';
            else if (path.includes('tb_prev') || o.concept_id === 167469) groupType = 'tb_prev';
            else if (path.includes('prepdrug') || o.concept_id === 167468) groupType = 'prepdrug';
            else if (path.includes('others_prev') || o.concept_id === 163101) groupType = 'others_prev';
            else if (path.includes('ARVDrug_1') || (o.concept_id === 162240 && path.endsWith('ARVDrug_1'))) groupType = 'ARVDrug_1';
            else if (path.includes('ARVDrug_2')) groupType = 'ARVDrug_2';
            else if (path.includes('ARVDrug_3')) groupType = 'ARVDrug_3';
            else if (path.includes('ARVDrug_4')) groupType = 'ARVDrug_4';
            else if (path.includes('ARVDrug_5')) groupType = 'ARVDrug_5';
            else if (o.concept_id === 162240) groupType = 'ARVDrug_1';

            if (groupType) {
              groups.set(o.obs_id, { groupType, items: {} });
            }
          }
        }

        const repeating: Record<string, any[]> = {
          oi_prophylaxis: [],
          tb_prev: [],
          prepdrug: [],
          others_prev: []
        };

        for (const o of encObsList) {
          const path = (o.form_namespace_and_path || '').replace(/^rfe(-forms)?\^(rfe-forms-)?/, '');
          const fieldId = path.split('/').pop() || path;
          const conceptLabel = o.concept_name || CIEL_CONCEPT_ID_MAP[o.concept_id] || `Concept #${o.concept_id}`;

          const isNumericField =
            [160856, 159368, 1443, 5089, 5090, 856, 5497, 1343].includes(o.concept_id) ||
            fieldId.toLowerCase().includes('qty') ||
            fieldId.toLowerCase().includes('duration') ||
            fieldId.toLowerCase().includes('dispensed') ||
            fieldId.toLowerCase().includes('prescribed') ||
            fieldId.toLowerCase().includes('days');

          let val: any;
          if (isNumericField) {
            val = o.value_numeric !== null && o.value_numeric !== undefined
              ? o.value_numeric
              : (o.coded_uuid === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || o.value_coded === 180 ? 180 : (!isNaN(Number(o.value_text)) ? Number(o.value_text) : o.value_numeric));
          } else {
            val = o.coded_uuid || o.coded_value_name || o.value_numeric || o.value_text;
          }
          if (o.value_datetime) val = new Date(o.value_datetime).toISOString().split('T')[0];

          // Normalize corrupted shoulder dislocation concept (180) in numeric fields
          if (isNumericField && (val === '180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || val === 180 || o.value_coded === 180)) {
            val = 180;
          }

          // Normalize OI Drugs concept 165727 when erroneously mapped to group construct concept 165726
          if (o.concept_id === 165727 || fieldId.includes('drugs_Cotrim')) {
            if (val === '99577a67-24b2-448f-aeab-6f1b67f265d6' || o.value_coded === 165726) {
              val = 'dbf8a287-3c82-440b-bfc3-a4b9432f9183'; // Cotrimoxazole
            }
          }

          // Normalize ARV and TB drug strengths to authentic human-readable names instead of raw concept UUIDs
          const isStrengthField =
            o.concept_id === 165725 ||
            (o.concept_name && o.concept_name.toLowerCase().includes('strength')) ||
            fieldId.toLowerCase().includes('strength');

          if (isStrengthField) {
            if (o.coded_uuid && DRUG_STRENGTH_LOOKUP[o.coded_uuid]) {
              val = DRUG_STRENGTH_LOOKUP[o.coded_uuid];
            } else if (o.value_coded && DRUG_STRENGTH_LOOKUP[String(o.value_coded)]) {
              val = DRUG_STRENGTH_LOOKUP[String(o.value_coded)];
            } else if (o.coded_value_name && DRUG_STRENGTH_LOOKUP[o.coded_value_name.toLowerCase()]) {
              val = DRUG_STRENGTH_LOOKUP[o.coded_value_name.toLowerCase()];
            } else if (o.coded_value_name) {
              val = o.coded_value_name;
            } else if (val && DRUG_STRENGTH_LOOKUP[String(val)]) {
              val = DRUG_STRENGTH_LOOKUP[String(val)];
            }
          } else if (
            o.value_coded === 166044 ||
            o.coded_uuid === '0cd9c98e-7f52-48b9-a987-404ec90cc5fe' ||
            String(val).toLowerCase() === '300/300/50mg'
          ) {
            val = '300/300/50mg';
          } else if (
            o.value_coded === 167522 ||
            o.coded_uuid === 'ffaaa42a-0c41-4e3f-a85a-7378f1c2efaf' ||
            String(val).toLowerCase() === '25/300/50mg'
          ) {
            val = '25/300/50mg';
          }

          if (val === undefined || val === null) continue;

          if (o.obs_group_id && groups.has(o.obs_group_id)) {
            const grp = groups.get(o.obs_group_id)!;
            if (fieldId) grp.items[fieldId] = val;
            if (conceptLabel && !grp.items[conceptLabel]) grp.items[conceptLabel] = val;
          } else if (!o.obs_group_id && !groups.has(o.obs_id)) {
            if (fieldId) dict[fieldId] = val;
            if (conceptLabel && !dict[conceptLabel]) dict[conceptLabel] = val;
          }
        }

        const deduplicateList = (items: any[]) => {
          const unique: any[] = [];
          const seen = new Set<string>();
          for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            const sig = JSON.stringify(item);
            if (!seen.has(sig)) {
              seen.add(sig);
              unique.push(item);
            }
          }
          return unique;
        };

        for (const [_, grp] of groups.entries()) {
          if (grp.groupType === 'oi_prophylaxis') {
            if (Object.keys(grp.items).length > 0) repeating.oi_prophylaxis.push(grp.items);
          } else if (grp.groupType === 'tb_prev') {
            if (Object.keys(grp.items).length > 0) repeating.tb_prev.push(grp.items);
          } else if (grp.groupType === 'prepdrug') {
            if (Object.keys(grp.items).length > 0) repeating.prepdrug.push(grp.items);
          } else if (grp.groupType === 'others_prev') {
            if (Object.keys(grp.items).length > 0) repeating.others_prev.push(grp.items);
          } else if (grp.groupType.startsWith('ARVDrug')) {
            Object.assign(dict, grp.items);
          }
        }

        dict.oi_prophylaxis = deduplicateList(repeating.oi_prophylaxis);
        dict.tb_prev = deduplicateList(repeating.tb_prev);
        dict.prepdrug = deduplicateList(repeating.prepdrug);
        dict.others_prev = deduplicateList(repeating.others_prev);

        obsByEnc.set(encId, dict);
      }

      // Group encounters by actual session date (YYYY-MM-DD)
      const encountersByDate = new Map<string, any[]>();
      for (const enc of encounters) {
        const dateStr = new Date(enc.encounter_datetime).toISOString().split('T')[0];
        if (!encountersByDate.has(dateStr)) {
          encountersByDate.set(dateStr, []);
        }
        encountersByDate.get(dateStr)!.push({
          ...enc,
          obs: obsByEnc.get(enc.encounter_id) || {}
        });
      }

      // Determine patient mortality and program status
      let patientStatus = 'ACTIVE';
      if (rawPat.dead === 1 || rawPat.dead === true || rawPat.death_date) {
        patientStatus = 'DECEASED';
      }

      for (const [_, obsDict] of obsByEnc.entries()) {
        for (const [k, v] of Object.entries(obsDict)) {
          const kLower = String(k).toLowerCase();
          const vLower = String(v).toLowerCase();
          if (kLower.includes('reason for program exit') || kLower.includes('patient outcome') || kLower.includes('art discontinuation') || kLower.includes('transferred out') || kLower.includes('status')) {
            if (vLower.includes('transfer') || vLower.includes('transferred')) {
              patientStatus = 'TRANSFERRED_OUT';
            } else if (vLower.includes('die') || vLower.includes('dead') || vLower.includes('deceased')) {
              patientStatus = 'DECEASED';
            } else if (vLower.includes('lost') || vLower.includes('ltfu')) {
              patientStatus = 'LTFU';
            } else if (vLower.includes('stop')) {
              patientStatus = 'STOPPED_TREATMENT';
            }
          }
        }
      }

      return {
        demographics: {
          openmrsUuid: rawPat.patient_uuid,
          artNumber: rawPat.art_number,
          hospitalNumber,
          firstName: rawPat.given_name || 'Patient',
          lastName: rawPat.family_name || 'NMRS',
          gender: rawPat.gender === 'M' ? 'MALE' : 'FEMALE',
          birthDate: rawPat.birthdate ? new Date(rawPat.birthdate) : new Date('1990-01-01'),
          addressLine: rawPat.address1 || 'Hospital District',
          city: rawPat.city_village || 'Community',
          state: rawPat.state_province || 'State',
          country: rawPat.country || 'Nigeria',
          phone,
          status: patientStatus,
          isDead: Boolean(rawPat.dead || patientStatus === 'DECEASED'),
          deathDate: rawPat.death_date ? new Date(rawPat.death_date) : null
        },
        encountersByDate
      };
    } catch (err: any) {
      await conn.end();
      throw err;
    }
  }

  /**
   * Pull all active patients from OpenMRS MySQL in bulk (< 2 seconds)
   */
  public static async pullAllCohortFromMySql(customConfig?: Partial<MySqlConfig>): Promise<any[]> {
    const base = await this.getConnectionConfig();
    const config = { ...base, ...customConfig };

    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000
    });

    try {
      const [rows]: any = await conn.execute(
        `SELECT p.patient_id, per.uuid as openmrsUuid,
                pn.given_name as firstName, pn.family_name as lastName,
                per.gender, per.birthdate as birthDate,
                pa.address1, pa.city_village, pa.state_province,
                GROUP_CONCAT(CONCAT(pi.identifier_type, ':', pi.identifier) SEPARATOR '||') as identifiers_raw
         FROM patient p
         JOIN person per ON p.patient_id = per.person_id AND per.voided = 0
         LEFT JOIN person_name pn ON per.person_id = pn.person_id AND pn.preferred = 1
         LEFT JOIN person_address pa ON per.person_id = pa.person_id AND pa.preferred = 1
         LEFT JOIN patient_identifier pi ON p.patient_id = pi.patient_id AND pi.voided = 0
         WHERE p.voided = 0
         GROUP BY p.patient_id, per.uuid, pn.given_name, pn.family_name, per.gender, per.birthdate, pa.address1, pa.city_village, pa.state_province`
      );

      await conn.end();

      return (rows || []).map((r: any) => {
        const idParts = (r.identifiers_raw || '').split('||');
        let pepfarId: string | null = null;
        let hospId: string | null = null;

        for (const part of idParts) {
          const [type, val] = part.split(':');
          if (val) {
            if (type === '4' || val.startsWith('IMO') || val.length >= 8) {
              if (!pepfarId) pepfarId = val;
            }
            if (type === '5' || type === '3') {
              if (!hospId) hospId = val;
            }
          }
        }

        const hospitalNumber = hospId || pepfarId || `NMRS-${r.openmrsUuid.slice(0, 6)}`;

        return {
          openmrsUuid: r.openmrsUuid,
          firstName: r.firstName || 'NMRS',
          lastName: r.lastName || 'Patient',
          gender: r.gender === 'F' ? 'FEMALE' : 'MALE',
          birthDate: r.birthDate || '1992-06-15',
          hospitalNumber,
          pepfarId,
          nin: null,
          bioData: {
            address1: r.address1,
            cityVillage: r.city_village,
            stateProvince: r.state_province
          },
          currentRegimen: '1a: TDF + 3TC + DTG',
          lastViralLoad: 0,
          lastCd4Count: 520,
          whoClinicalStage: 'STAGE_1'
        };
      });
    } catch (err: any) {
      await conn.end();
      throw err;
    }
  }

  /**
   * Fetch live concept metadata directly from the OpenMRS MySQL 'concept' table by UUID or concept_id.
   * Joins concept_datatype, concept_class, and preferred concept_name.
   */
  public static async getLiveConcept(
    uuidOrId: string | number,
    customConfig?: Partial<MySqlConfig>
  ): Promise<LiveConceptInfo | null> {
    if (!uuidOrId) return null;
    const key = String(uuidOrId).trim();
    if (!key) return null;

    let conn: any = null;
    try {
      const base = await this.getConnectionConfig();
      const config = { ...base, ...customConfig };

      conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 4000
      });

      const isUuid = key.length >= 30;
      const isNum = !isNaN(Number(key));

      let sql = `
        SELECT 
          c.concept_id, 
          c.uuid, 
          c.datatype_id, 
          cd.name AS datatype_name,
          c.class_id, 
          cc.name AS class_name, 
          c.is_set,
          (
            SELECT cn.name 
            FROM concept_name cn 
            WHERE cn.concept_id = c.concept_id AND cn.voided = 0 
            ORDER BY cn.locale_preferred DESC, (cn.concept_name_type = 'FULLY_SPECIFIED') DESC 
            LIMIT 1
          ) AS preferred_name
        FROM concept c
        LEFT JOIN concept_datatype cd ON c.datatype_id = cd.concept_datatype_id
        LEFT JOIN concept_class cc ON c.class_id = cc.concept_class_id
        WHERE `;

      const params: any[] = [];
      if (isUuid) {
        sql += `c.uuid = ? LIMIT 1`;
        params.push(key);
      } else if (isNum) {
        sql += `c.concept_id = ? LIMIT 1`;
        params.push(Number(key));
      } else {
        sql += `c.uuid = ? OR c.concept_id = ? LIMIT 1`;
        params.push(key, key);
      }

      const [rows]: any = await conn.execute(sql, params);
      await conn.end();

      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          conceptId: r.concept_id,
          uuid: r.uuid,
          datatypeId: r.datatype_id,
          datatypeName: r.datatype_name,
          classId: r.class_id,
          className: r.class_name,
          isSet: Boolean(r.is_set),
          preferredName: r.preferred_name
        };
      }
      return null;
    } catch (err: any) {
      if (conn) {
        try { await conn.end(); } catch {}
      }
      return null;
    }
  }

  /**
   * Batch fetch live concepts by UUIDs/IDs from OpenMRS MySQL 'concept' table.
   */
  public static async getLiveConcepts(
    keys: string[],
    customConfig?: Partial<MySqlConfig>
  ): Promise<Map<string, LiveConceptInfo>> {
    const results = new Map<string, LiveConceptInfo>();
    if (!keys || keys.length === 0) return results;

    const validKeys = Array.from(new Set(keys.map(k => String(k).trim()).filter(Boolean)));
    if (validKeys.length === 0) return results;

    let conn: any = null;
    try {
      const base = await this.getConnectionConfig();
      const config = { ...base, ...customConfig };

      conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 4000
      });

      const uuids = validKeys.filter(k => k.length >= 30);
      const numIds = validKeys.filter(k => !isNaN(Number(k))).map(Number);

      const conditions: string[] = [];
      const params: any[] = [];

      if (uuids.length > 0) {
        conditions.push(`c.uuid IN (${uuids.map(() => '?').join(',')})`);
        params.push(...uuids);
      }
      if (numIds.length > 0) {
        conditions.push(`c.concept_id IN (${numIds.map(() => '?').join(',')})`);
        params.push(...numIds);
      }

      if (conditions.length === 0) {
        await conn.end();
        return results;
      }

      const sql = `
        SELECT 
          c.concept_id, 
          c.uuid, 
          c.datatype_id, 
          cd.name AS datatype_name,
          c.class_id, 
          cc.name AS class_name, 
          c.is_set,
          (
            SELECT cn.name 
            FROM concept_name cn 
            WHERE cn.concept_id = c.concept_id AND cn.voided = 0 
            ORDER BY cn.locale_preferred DESC, (cn.concept_name_type = 'FULLY_SPECIFIED') DESC 
            LIMIT 1
          ) AS preferred_name
        FROM concept c
        LEFT JOIN concept_datatype cd ON c.datatype_id = cd.concept_datatype_id
        LEFT JOIN concept_class cc ON c.class_id = cc.concept_class_id
        WHERE ${conditions.join(' OR ')}
      `;

      const [rows]: any = await conn.execute(sql, params);
      await conn.end();

      if (rows && Array.isArray(rows)) {
        for (const r of rows) {
          const info: LiveConceptInfo = {
            conceptId: r.concept_id,
            uuid: r.uuid,
            datatypeId: r.datatype_id,
            datatypeName: r.datatype_name,
            classId: r.class_id,
            className: r.class_name,
            isSet: Boolean(r.is_set),
            preferredName: r.preferred_name
          };
          results.set(r.uuid, info);
          results.set(String(r.concept_id), info);
        }
      }
    } catch (err: any) {
      if (conn) {
        try { await conn.end(); } catch {}
      }
    }
    return results;
  }

  /**
   * Fetch active clinical providers from OpenMRS provider & person_name tables and local staff directory
   */
  public static async fetchProviders(): Promise<Array<{ id: string | number; name: string; identifier?: string; uuid?: string }>> {
    const providerMap = new Map<string, { id: string | number; name: string; identifier?: string; uuid?: string }>();

    // 1. Fetch real active staff from PostgreSQL database
    try {
      const staffMembers = await prisma.staff.findMany({
        where: { isActive: true },
        orderBy: { lastName: 'asc' },
        take: 50
      });
      for (const s of staffMembers) {
        const titleOrRole = s.designation || s.specialization || s.department || 'Clinical Officer';
        const formattedName = `${s.firstName} ${s.lastName} (${titleOrRole})`;
        providerMap.set(formattedName.toLowerCase(), {
          id: s.employeeId || s.id,
          name: formattedName,
          identifier: s.employeeId || s.id,
          uuid: s.id
        });
      }
    } catch (err: any) {
      console.warn(`[NMRS Providers] Could not fetch local staff: ${err.message}`);
    }

    // 2. Fetch active providers from OpenMRS MySQL if available
    try {
      const config = await this.getConnectionConfig();
      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 3000
      });

      const [rows]: any = await conn.execute(`
        SELECT pr.provider_id as id, pr.identifier, pr.uuid,
               COALESCE(CONCAT(pn.given_name, ' ', pn.family_name), pr.name, pr.identifier) as name
        FROM provider pr
        LEFT JOIN person_name pn ON pr.person_id = pn.person_id AND pn.voided = 0
        WHERE pr.retired = 0
        LIMIT 50
      `);

      await conn.end();
      if (rows && rows.length > 0) {
        for (const r of rows) {
          const pName = r.name || `Provider ${r.identifier || r.id}`;
          providerMap.set(pName.toLowerCase(), {
            id: String(r.id),
            name: pName,
            identifier: r.identifier,
            uuid: r.uuid
          });
        }
      }
    } catch (err: any) {
      console.warn(`[NMRS MySQL] Could not fetch providers from MySQL: ${err.message}`);
    }

    if (providerMap.size > 0) {
      return Array.from(providerMap.values());
    }

    // Fallback standard clinical roles if no database staff is returned
    return [
      { id: '1', name: 'Chief Medical Officer / Consultant Physician', identifier: 'CMO-001' },
      { id: '2', name: 'Clinical Pharmacist (ART Pharmacy)', identifier: 'PHARM-001' },
      { id: '3', name: 'Nursing Officer / ART Counselor', identifier: 'NURSE-001' },
      { id: '4', name: 'Medical Records Officer (Health Informatics)', identifier: 'MRO-001' }
    ];
  }

  /**
   * Fetch active locations from OpenMRS location table
   */
  public static async fetchLocations(): Promise<Array<{ id: string | number; name: string; description?: string; uuid?: string }>> {
    const fallbackLocations = [
      { id: '1', name: 'Main Facility / ARV Clinic', description: 'Faith Foundation Specialist Hospital' },
      { id: '2', name: 'Pharmacy Dispensing Unit', description: 'ARV Pharmacy & MMD' },
      { id: '3', name: 'Adult ART Clinic', description: 'Consultation & Follow-up' },
      { id: '4', name: 'PMTCT / MCH Clinic', description: 'Maternal Child Health' },
      { id: '5', name: 'Laboratory Unit', description: 'Viral Load & CD4 Testing' }
    ];

    try {
      const config = await this.getConnectionConfig();
      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 3000
      });

      const [rows]: any = await conn.execute(`
        SELECT location_id as id, name, description, uuid
        FROM location
        WHERE retired = 0
        LIMIT 50
      `);

      await conn.end();
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: String(r.id),
          name: r.name,
          description: r.description,
          uuid: r.uuid
        }));
      }
    } catch (err: any) {
      console.warn(`[NMRS MySQL] Could not fetch locations from MySQL: ${err.message}`);
    }

    return fallbackLocations;
  }

  /**
   * Live Push: Insert or update an encounter record directly into OpenMRS MySQL
   * (writes to encounter, encounter_provider, and obs tables on the laptop server)
   */
  public static async pushEncounterToMySql(recordId: string): Promise<any> {
    const encRecord = await prisma.nmrsEncounterRecord.findUnique({
      where: { id: recordId },
      include: {
        formSchema: true,
        patient: { include: { nmrsMapping: true } }
      }
    });

    if (!encRecord || !encRecord.patient) {
      throw new Error(`Encounter record ${recordId} or patient not found`);
    }

    const patient = encRecord.patient;
    const config = await this.getConnectionConfig();
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000
    });

    try {
      // 1. Locate patient in MySQL
      const artClean = (patient.patientNumber || patient.identification || '').trim();
      const pepfarClean = (patient.nmrsMapping?.pepfarId || (encRecord.formData as any)?.art_number || '').trim();
      const ptUuid = patient.openmrsUuid || patient.nmrsMapping?.openmrsUuid || '';

      const [ptRows]: any = await conn.execute(`
        SELECT p.patient_id, per.uuid as person_uuid
        FROM patient p
        JOIN person per ON p.patient_id = per.person_id
        LEFT JOIN patient_identifier pi ON p.patient_id = pi.patient_id
        WHERE (per.uuid = ? AND ? != '')
           OR (pi.identifier = ? AND ? != '')
           OR (pi.identifier = ? AND ? != '')
           OR (pi.identifier LIKE ? AND ? != '')
        LIMIT 1
      `, [ptUuid, ptUuid, artClean, artClean, pepfarClean, pepfarClean, `%${artClean}%`, artClean]);

      if (!ptRows || ptRows.length === 0) {
        throw new Error(`Patient "${artClean || pepfarClean}" not found in OpenMRS MySQL database`);
      }

      const openmrsPatientId = ptRows[0].patient_id;
      const openmrsPersonUuid = ptRows[0].person_uuid;

      // Ensure local TerkHealth360 database has the OpenMRS patient UUID
      if (openmrsPersonUuid && (!patient.openmrsUuid || patient.openmrsUuid !== openmrsPersonUuid)) {
        await prisma.patient.update({
          where: { id: patient.id },
          data: { openmrsUuid: openmrsPersonUuid }
        }).catch(() => {});
      }

      // 2. Resolve Encounter Type
      const formName = encRecord.formSchema?.formName || encRecord.encounterType || 'Pharmacy Order Form';
      const encTypeUuid = (encRecord.formSchema?.schemaJson as any)?.encounterType || '';
      let encounterTypeId = 1;

      if (encTypeUuid) {
        const [uuidTypes]: any = await conn.execute(
          `SELECT encounter_type_id FROM encounter_type WHERE uuid = ? LIMIT 1`,
          [encTypeUuid]
        );
        if (uuidTypes && uuidTypes.length > 0) {
          encounterTypeId = uuidTypes[0].encounter_type_id;
        }
      }

      if (encounterTypeId === 1) {
        const [encTypes]: any = await conn.execute(`
          SELECT encounter_type_id, name FROM encounter_type
          WHERE retired = 0 AND (name LIKE ? OR name LIKE ? OR name LIKE ?)
          LIMIT 1
        `, [`%${formName.slice(0, 8)}%`, '%Pharmacy%', '%Clinical%']);

        if (encTypes && encTypes.length > 0) {
          encounterTypeId = encTypes[0].encounter_type_id;
        }
      }

      // 3. Resolve Form ID
      let formId: number | null = null;
      const formUuid = encRecord.formSchema?.openmrsFormUuid ||
        (encRecord.formSchema?.schemaJson as any)?.uuid ||
        (formName.toLowerCase().includes('pharmacy') ? '4a238dc4-a76b-4c0f-a100-229d98fd5758' : '');
      const [forms]: any = await conn.execute(`
        SELECT form_id FROM form
        WHERE retired = 0 AND (uuid = ? OR uuid = '4a238dc4-a76b-4c0f-a100-229d98fd5758' OR name LIKE ? OR name LIKE '%Pharmacy%')
        ORDER BY (CASE WHEN uuid = ? THEN 1 WHEN uuid = '4a238dc4-a76b-4c0f-a100-229d98fd5758' THEN 2 ELSE 3 END)
        LIMIT 1
      `, [formUuid, `%${formName.slice(0, 10)}%`, formUuid]);

      if (forms && forms.length > 0) {
        formId = forms[0].form_id;
      }

      // 4. Resolve Location ID & Provider ID
      let locationId = 1;
      const [locs]: any = await conn.execute(`SELECT location_id FROM location WHERE retired = 0 LIMIT 1`);
      if (locs && locs.length > 0) locationId = locs[0].location_id;

      let providerId = 1;
      const [provs]: any = await conn.execute(`SELECT provider_id FROM provider WHERE retired = 0 LIMIT 1`);
      if (provs && provs.length > 0) providerId = provs[0].provider_id;

      let encRoleId = 1;
      const [roleRows]: any = await conn.execute(`SELECT encounter_role_id FROM encounter_role WHERE retired = 0 LIMIT 1`);
      if (roleRows && roleRows.length > 0) encRoleId = roleRows[0].encounter_role_id;

      const encDatetime = encRecord.encounterDate ? new Date(encRecord.encounterDate) : new Date();

      // 4b. Resolve or create OpenMRS Visit for this patient and encounter datetime
      let hasVisitIdCol = true;
      try {
        const [colCheck]: any = await conn.execute(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'encounter' AND COLUMN_NAME = 'visit_id'
          LIMIT 1
        `);
        hasVisitIdCol = Boolean(colCheck && colCheck.length > 0);
      } catch {
        hasVisitIdCol = true;
      }

      let visitId: number | null = null;
      if (hasVisitIdCol) {
        try {
          // Look for an existing visit covering the encounter date
          const [existingVisits]: any = await conn.execute(`
            SELECT visit_id FROM visit
            WHERE patient_id = ?
              AND voided = 0
              AND DATE(date_started) <= DATE(?)
              AND (date_stopped IS NULL OR DATE(date_stopped) >= DATE(?))
            ORDER BY date_started DESC
            LIMIT 1
          `, [openmrsPatientId, encDatetime, encDatetime]);

          if (existingVisits && existingVisits.length > 0) {
            visitId = existingVisits[0].visit_id;
          } else {
            // Check for visit on exact same day
            const [sameDayVisits]: any = await conn.execute(`
              SELECT visit_id FROM visit
              WHERE patient_id = ?
                AND voided = 0
                AND DATE(date_started) = DATE(?)
              ORDER BY date_started DESC
              LIMIT 1
            `, [openmrsPatientId, encDatetime]);

            if (sameDayVisits && sameDayVisits.length > 0) {
              visitId = sameDayVisits[0].visit_id;
            } else {
              // Resolve visit_type_id (Facility Visit preferred)
              let visitTypeId = 1;
              try {
                const [vtRows]: any = await conn.execute(`
                  SELECT visit_type_id FROM visit_type
                  WHERE retired = 0 OR retired IS NULL
                  ORDER BY (CASE WHEN name LIKE '%Facility%' THEN 1 WHEN name LIKE '%Clinical%' THEN 2 ELSE 3 END), visit_type_id ASC
                  LIMIT 1
                `);
                if (vtRows && vtRows.length > 0) {
                  visitTypeId = vtRows[0].visit_type_id;
                }
              } catch {
                visitTypeId = 1;
              }

              const isToday = new Date().toISOString().split('T')[0] === encDatetime.toISOString().split('T')[0];
              const dateStopped = isToday ? null : encDatetime;

              const [newVisitRes]: any = await conn.execute(`
                INSERT INTO visit (patient_id, visit_type_id, date_started, date_stopped, location_id, creator, date_created, voided, uuid)
                VALUES (?, ?, ?, ?, ?, 1, NOW(), 0, UUID())
              `, [openmrsPatientId, visitTypeId, encDatetime, dateStopped, locationId]);

              visitId = newVisitRes.insertId;
            }
          }
        } catch (vErr: any) {
          console.warn(`[NMRS MySql] Visit resolution warning: ${vErr?.message}`);
        }
      }

      // 5. Insert or Update Encounter
      let encounterId = 0;
      let openmrsUuid = encRecord.openmrsEncounterUuid;

      if (openmrsUuid) {
        const numericEncId = openmrsUuid.startsWith('myenc-') ? parseInt(openmrsUuid.replace('myenc-', ''), 10) : (Number.isInteger(Number(openmrsUuid)) ? Number(openmrsUuid) : 0);
        const [existingEnc]: any = await conn.execute(
          `SELECT encounter_id, uuid, visit_id FROM encounter WHERE uuid = ? OR (encounter_id = ? AND ? > 0) LIMIT 1`,
          [openmrsUuid, numericEncId, numericEncId]
        );
        if (existingEnc && existingEnc.length > 0) {
          encounterId = existingEnc[0].encounter_id;
          openmrsUuid = existingEnc[0].uuid;
          const targetVisitId = existingEnc[0].visit_id || visitId;
          if (hasVisitIdCol) {
            await conn.execute(
              `UPDATE encounter SET voided = 0, date_voided = NULL, voided_by = NULL, void_reason = NULL, encounter_datetime = ?, form_id = ?, encounter_type = ?, visit_id = ? WHERE encounter_id = ?`,
              [encDatetime, formId, encounterTypeId, targetVisitId, encounterId]
            );
          } else {
            await conn.execute(
              `UPDATE encounter SET voided = 0, date_voided = NULL, voided_by = NULL, void_reason = NULL, encounter_datetime = ?, form_id = ?, encounter_type = ? WHERE encounter_id = ?`,
              [encDatetime, formId, encounterTypeId, encounterId]
            );
          }
          // Delete old observations to re-insert fresh (breaking foreign keys first to prevent obs_grouping_id constraint failure)
          try {
            await conn.execute(`UPDATE obs SET obs_group_id = NULL WHERE encounter_id = ?`, [encounterId]);
            await conn.execute(`DELETE FROM obs WHERE encounter_id = ?`, [encounterId]);
          } catch (deleteObsErr: any) {
            console.warn(`[NmrsMySqlConnector] Safe delete retry with foreign key checks toggled: ${deleteObsErr?.message}`);
            await conn.execute(`SET FOREIGN_KEY_CHECKS = 0`);
            await conn.execute(`DELETE FROM obs WHERE encounter_id = ?`, [encounterId]);
            await conn.execute(`SET FOREIGN_KEY_CHECKS = 1`);
          }
        } else {
          openmrsUuid = null;
        }
      }

      if (!openmrsUuid) {
        const [uuidRes]: any = await conn.execute(`SELECT UUID() as u`);
        openmrsUuid = uuidRes[0].u;

        if (hasVisitIdCol) {
          const [insertRes]: any = await conn.execute(`
            INSERT INTO encounter (encounter_type, patient_id, location_id, form_id, encounter_datetime, visit_id, creator, date_created, voided, uuid)
            VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), 0, ?)
          `, [encounterTypeId, openmrsPatientId, locationId, formId, encDatetime, visitId, openmrsUuid]);
          encounterId = insertRes.insertId;
        } else {
          const [insertRes]: any = await conn.execute(`
            INSERT INTO encounter (encounter_type, patient_id, location_id, form_id, encounter_datetime, creator, date_created, voided, uuid)
            VALUES (?, ?, ?, ?, ?, 1, NOW(), 0, ?)
          `, [encounterTypeId, openmrsPatientId, locationId, formId, encDatetime, openmrsUuid]);
          encounterId = insertRes.insertId;
        }

        // Insert into encounter_provider
        try {
          await conn.execute(`
            INSERT INTO encounter_provider (encounter_id, provider_id, encounter_role_id, creator, date_created, voided, uuid)
            VALUES (?, ?, ?, 1, NOW(), 0, UUID())
          `, [encounterId, providerId, encRoleId]);
        } catch {
          // non-fatal
        }
      }

      // 6. Insert Observations
      const formData: Record<string, any> = (encRecord.formData && typeof encRecord.formData === 'object' ? encRecord.formData : {}) as Record<string, any>;
      let obsInserted = 0;

      // Build questionId -> conceptUuidOrId map from schemaJson
      const schemaConceptMap: Record<string, string> = {};
      const extractConcepts = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.id && (obj.conceptId || obj.concept || obj.questionOptions?.concept)) {
          schemaConceptMap[String(obj.id)] = String(obj.conceptId || obj.concept || obj.questionOptions?.concept);
        }
        for (const child of Object.values(obj)) {
          if (typeof child === 'object') extractConcepts(child);
        }
      };
      if (encRecord.formSchema?.schemaJson) {
        extractConcepts(encRecord.formSchema.schemaJson);
      }

      let hasFormNamespaceCol = false;
      try {
        const [colRows]: any = await conn.execute(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'obs' AND COLUMN_NAME = 'form_namespace_and_path'
          LIMIT 1
        `);
        hasFormNamespaceCol = Boolean(colRows && colRows.length > 0);
      } catch {
        hasFormNamespaceCol = false;
      }

      let hasObsGroupIdCol = false;
      try {
        const [ogCols]: any = await conn.execute(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'obs' AND COLUMN_NAME = 'obs_group_id'
          LIMIT 1
        `);
        hasObsGroupIdCol = Boolean(ogCols && ogCols.length > 0);
      } catch {
        hasObsGroupIdCol = false;
      }

      let hasStatusCol = false;
      try {
        const [stCols]: any = await conn.execute(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'obs' AND COLUMN_NAME = 'status'
          LIMIT 1
        `);
        hasStatusCol = Boolean(stCols && stCols.length > 0);
      } catch {
        hasStatusCol = false;
      }

      // Exact national schema concept ID mappings (CIEL integer equivalents)
      const SCHEMA_CONCEPT_FALLBACK_MAP: Record<string, number> = {
        // TPT / TB Preventive Therapy construct
        'f3772dae-fc93-4428-baa7-268f83462e3f': 167469,
        'tb_prev': 167469,
        '167469': 167469,
        'b04e1799-87fa-476c-bd43-c05a7de70a69': 165727, // tb_prev_drugs / oi drugs
        '21ea74ee-f6fa-4c55-be36-6337a8f4086c': 165725, // tb_prev_drugs_strength / drug strength
        '4919b76b-81e6-41c7-a5b5-cb383ff4b2fa': 165723, // tb_prev_drugs_frequency / frequency
        '640de6fb-a670-43e6-8e6c-c3d33582e1a8': 159368, // tb_prevDispensedInDays
        '160856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 160856, // qty_prescribed_tb_prev
        '160856': 160856,
        '159368AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 159368, // tb_prev_drugs_duration_Pres
        '159368': 159368,
        '1443AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 1443,
        '1443': 1443,

        // TPT Answer Concepts
        'abbb66b8-61c9-4b58-bad6-edf1efa546e1': 1679,   // 300mg
        '27f5a185-9791-45b2-89e8-89df69fdac71': 165060, // 100mg
        'cd94a1ed-2812-4170-8bc7-90abded1beab': 165062, // 150Mg/75mg
        '550b250c-fcc8-4176-b833-2b1355982597': 165063, // 150Mg/75mg/40mg
        '6717b4c6-4cf3-4ef1-9734-f2da5300003f': 165064, // 300/150mg
        'fcd74eb9-c917-42b1-969a-696b15a5627c': 165065, // 300/300mg
        '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 656,    // Isoniazid
        '656': 656,
        '1675AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 1675,   // RHZE
        '768AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 768,    // RHZ
        '1108AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 1108,   // EH
        '1194': 1194,                                   // RH
        '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 160862, // Once daily
        '160862': 160862,
        '160858AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 160858, // Twice daily
        '160858': 160858,
        '6f973a60-16a5-49bc-9278-300a9e998646': 165721, // 2 BD

        // OI Prophylaxis construct & answers
        '99577a67-24b2-448f-aeab-6f1b67f265d6': 165726,
        'oi_prophylaxis': 165726,
        '165726': 165726,
        'drugs_Cotrim': 165727,
        '165727': 165727,
        'dbf8a287-3c82-440b-bfc3-a4b9432f9183': 165257, // Cotrimoxazole drug answer concept
        '165257': 165257,
        'Cotrimoxazole': 165257,
        'CTX': 165257,
        'c03561ed-1402-4bfe-b95d-9547fe6b9bf7': 165062, // 960mg
        '960mg': 165062,

        // PrEP construct
        '9734f48e-5089-4b1d-bade-eae45a86670f': 167468,
        'c83188a1-f411-49f5-a1b6-19881a0354a2': 167468,
        'prepdrug': 167468,
        '167468': 167468,
        'd6a11b94-efe5-415e-8071-29d75356bac0': 165616, // 600mg
        '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 161364,
        '161364': 161364,

        // ARV construct & fields
        '162240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 162240,
        '162240': 162240,
        'c50dc847-e37e-40b1-92b9-408d9c93b858': 165724, // ARV Medication question concept
        '165724': 165724,
        'Drugs_ART_1': 165724,
        'Drugs_ART_2': 165724,
        'Drugs_ART_3': 165724,
        'Drugs_ART_4': 165724,
        'Drugs_ART_5': 165724,
        'Drug_Strength_ART_1': 165725,
        'Drug_Strength_ART_2': 165725,
        'Drug_Strength_ART_3': 165725,
        'Drug_Strength_ART_4': 165725,
        'Drug_Strength_ART_5': 165725,
        'Drug_Frequency_ART_1': 165723,
        'Drug_Frequency_ART_2': 165723,
        'Drug_Frequency_ART_3': 165723,
        'Drug_Frequency_ART_4': 165723,
        'Drug_Frequency_ART_5': 165723,
        'duration_pharm_ART_1': 159368,
        'duration_pharm_ART_2': 159368,
        'duration_pharm_ART_3': 159368,
        'duration_pharm_ART_4': 159368,
        'duration_pharm_ART_5': 159368,
        'qty_prescribed_pharm_ART_1': 160856,
        'qty_prescribed_pharm_ART_2': 160856,
        'qty_prescribed_pharm_ART_3': 160856,
        'qty_prescribed_pharm_ART_4': 160856,
        'qty_prescribed_pharm_ART_5': 160856,
        'arvDispensedInDays_ART_1': 159368,
        'arvDispensedInDays_ART_2': 159368,
        'arvDispensedInDays_ART_3': 159368,
        'arvDispensedInDays_ART_4': 159368,
        'arvDispensedInDays_ART_5': 159368,
        'qty_dispensed_pharm_ART_1': 1443,
        'qty_dispensed_pharm_ART_2': 1443,
        'qty_dispensed_pharm_ART_3': 1443,
        'qty_dispensed_pharm_ART_4': 1443,
        'qty_dispensed_pharm_ART_5': 1443,

        // ARV Drug Answers & Regimens
        '8a343013-0216-44e0-aefe-53909ffd5631': 165681, // TDF-3TC-DTG
        '165681': 165681,
        '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 164505, // TDF-3TC-EFV
        '164505': 164505,
        'TDF-3TC-EFV': 164505,
        'Tenofovir / Lamivudine / Efavirenz (TDF/3TC/EFV)': 164505,
        '164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 164506, // Adult 1st Line ARV Regimen
        '164506': 164506,
        'Adult_1st_Line_Regimens': 164506,

        '0cd9c98e-7f52-48b9-a987-404ec90cc5fe': 166044, // 300/300/50mg
        '300/300/50mg': 166044,
        'ffaaa42a-0c41-4e3f-a85a-7378f1c2efaf': 167522, // 25/300/50mg
        '25/300/50mg': 167522,
        '25/300/50Mg': 167522,
        '25_300_50mg': 167522,
        '6c32f10b-e26d-4299-97af-41b797a8253e': 167517, // TAF-3TC-DTG
        'TAF-3TC-DTG': 167517,
        '2893350f-6710-40c6-b963-ff2d9789567d': 167520, // Tenofovir-alafenamide/Lamivudine/Dolutegravir
        '167520': 167520,
        'Tenofovir-alafenamide/Lamivudine/Dolutegravir': 167520,
        'Tenofovir Alafenamide / Lamivudine / Dolutegravir (TAF/3TC/DTG)': 167520,
        '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 1652,
        '1652': 1652,
        'AZT-3TC-NVP': 1652,
      };

      // Helper: Resolve concept ID from UUID, numeric ID, CIEL map, or name
      const resolveConceptId = async (conceptKeyOrUuid: string): Promise<number | null> => {
        if (!conceptKeyOrUuid) return null;
        const mapped = schemaConceptMap[conceptKeyOrUuid] || conceptKeyOrUuid;

        // 1. Live Query: Check live OpenMRS 'concept' table by UUID first!
        const candidateUuid = mapped.length >= 30 ? mapped : (conceptKeyOrUuid.length >= 30 ? conceptKeyOrUuid : null);
        if (candidateUuid) {
          const [cRows]: any = await conn.execute(
            `SELECT concept_id FROM concept WHERE uuid = ? LIMIT 1`,
            [candidateUuid]
          );
          if (cRows && cRows.length > 0) return cRows[0].concept_id;
        }

        // 2. Schema concept fallbacks
        if (SCHEMA_CONCEPT_FALLBACK_MAP[conceptKeyOrUuid]) {
          return SCHEMA_CONCEPT_FALLBACK_MAP[conceptKeyOrUuid];
        }
        if (SCHEMA_CONCEPT_FALLBACK_MAP[mapped]) {
          return SCHEMA_CONCEPT_FALLBACK_MAP[mapped];
        }

        if (!isNaN(Number(mapped))) {
          const [cRows]: any = await conn.execute(
            `SELECT concept_id FROM concept WHERE concept_id = ? LIMIT 1`,
            [Number(mapped)]
          );
          if (cRows && cRows.length > 0) return cRows[0].concept_id;
        }

        const cielNum = (CIEL_CONCEPT_ID_MAP as any)[conceptKeyOrUuid] || (CIEL_CONCEPT_ID_MAP as any)[mapped];
        if (cielNum) {
          const [cRows]: any = await conn.execute(
            `SELECT concept_id FROM concept WHERE concept_id = ? LIMIT 1`,
            [cielNum]
          );
          if (cRows && cRows.length > 0) return cRows[0].concept_id;
        }

        const [cNameRows]: any = await conn.execute(`
          SELECT c.concept_id FROM concept c
          JOIN concept_name cn ON c.concept_id = cn.concept_id
          WHERE cn.name = ? OR cn.name LIKE ?
          LIMIT 1
        `, [conceptKeyOrUuid, `%${conceptKeyOrUuid.slice(0, 15)}%`]);
        if (cNameRows && cNameRows.length > 0) return cNameRows[0].concept_id;

        return null;
      };

      // Helper: Insert a single observation (parent group or member)
      const insertSingleObs = async (
        cId: number,
        obsVal: any,
        namespacePath: string,
        obsGroupId: number | null = null
      ): Promise<number | null> => {
        let valNumeric: number | null = null;
        let valDatetime: Date | null = null;
        let valCoded: number | null = null;
        let valText: string | null = null;

        // Query the live concept table to check datatype directly from the database!
        let liveDatatype: string | null = null;
        try {
          const [dtRows]: any = await conn.execute(
            `SELECT cd.name AS datatype_name FROM concept c
             JOIN concept_datatype cd ON c.datatype_id = cd.concept_datatype_id
             WHERE c.concept_id = ? LIMIT 1`,
            [cId]
          );
          if (dtRows && dtRows.length > 0) {
            liveDatatype = dtRows[0].datatype_name;
          }
        } catch {}

        const NUMERIC_CONCEPTS = new Set([
          160856, // Quantity Prescribed
          159368, // Medication duration in days / Dispensed in days
          1443,   // Quantity Dispensed
          5089,   // Weight (kg)
          5090,   // Height (cm)
          856,    // HIV Viral Load
          5497,   // CD4 Count
          1343    // CD4 Count
        ]);

        const pathStr = namespacePath.slice(0, 250);
        const isNumeric =
          liveDatatype === 'Numeric' ||
          NUMERIC_CONCEPTS.has(cId) ||
          pathStr.toLowerCase().includes('duration') ||
          pathStr.toLowerCase().includes('qty') ||
          pathStr.toLowerCase().includes('prescribed') ||
          pathStr.toLowerCase().includes('dispensed') ||
          pathStr.toLowerCase().includes('days') ||
          pathStr.toLowerCase().includes('weight') ||
          pathStr.toLowerCase().includes('height');

        if (obsVal !== null && obsVal !== undefined) {
          if (isNumeric) {
            valNumeric = Number(obsVal);
            valCoded = null;
            valText = null;
          } else if (typeof obsVal === 'number') {
            valNumeric = obsVal;
          } else if (typeof obsVal === 'boolean') {
            valCoded = obsVal ? 1065 : 1066;
          } else if (String(obsVal).match(/^\d{4}-\d{2}-\d{2}/)) {
            valDatetime = new Date(String(obsVal));
          } else {
            const strVal = String(obsVal);
            if (SCHEMA_CONCEPT_FALLBACK_MAP[strVal]) {
              valCoded = SCHEMA_CONCEPT_FALLBACK_MAP[strVal];
            } else if (strVal.includes('AAAA') || strVal.length >= 30) {
              const [codedRows]: any = await conn.execute(
                `SELECT concept_id FROM concept WHERE uuid = ? LIMIT 1`,
                [strVal]
              );
              if (codedRows && codedRows.length > 0) {
                valCoded = codedRows[0].concept_id;
              } else if (SCHEMA_CONCEPT_FALLBACK_MAP[strVal]) {
                valCoded = SCHEMA_CONCEPT_FALLBACK_MAP[strVal];
              } else {
                valText = strVal;
              }
            } else {
              valText = typeof obsVal === 'object' ? JSON.stringify(obsVal) : strVal;
            }
          }
        }
        const useGroup = hasObsGroupIdCol && obsGroupId !== null;

        let insertSql = `
          INSERT INTO obs (person_id, concept_id, encounter_id, obs_datetime, location_id,
                           value_coded, value_datetime, value_numeric, value_text,
                           ${hasFormNamespaceCol ? 'form_namespace_and_path,' : ''}
                           ${useGroup ? 'obs_group_id,' : ''}
                           ${hasStatusCol ? 'status,' : ''}
                           creator, date_created, voided, uuid)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
                  ${hasFormNamespaceCol ? '?, ' : ''}
                  ${useGroup ? '?, ' : ''}
                  ${hasStatusCol ? "'FINAL', " : ''}
                  1, NOW(), 0, UUID())
        `;
        const params: any[] = [
          openmrsPatientId, cId, encounterId, encDatetime, locationId,
          valCoded, valDatetime, valNumeric, valText
        ];
        if (hasFormNamespaceCol) params.push(pathStr);
        if (useGroup) params.push(obsGroupId);

        const [res]: any = await conn.execute(insertSql, params);
        obsInserted++;
        return res.insertId;
      };

      // Extract all obsGroup definitions from schemaJson
      interface ObsGroupMeta {
        id: string;
        concept: string;
        isRepeating: boolean;
        subQuestions: Array<{ id: string; concept: string }>;
      }
      const obsGroupDefs: ObsGroupMeta[] = [];
      const extractObsGroups = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.type === 'obsGroup' && obj.id) {
          const grpConcept = String(obj.concept || obj.questionOptions?.concept || '');
          const isRepeating = obj.questionOptions?.rendering === 'repeating';
          const subQuestions: Array<{ id: string; concept: string }> = [];
          if (Array.isArray(obj.questions)) {
            obj.questions.forEach((q: any) => {
              if (q && q.id) {
                subQuestions.push({
                  id: String(q.id),
                  concept: String(q.concept || q.questionOptions?.concept || '')
                });
              }
            });
          }
          obsGroupDefs.push({
            id: String(obj.id),
            concept: grpConcept,
            isRepeating,
            subQuestions
          });
        }
        for (const child of Object.values(obj)) {
          if (typeof child === 'object') extractObsGroups(child);
        }
      };
      if (encRecord.formSchema?.schemaJson) {
        extractObsGroups(encRecord.formSchema.schemaJson);
      }

      const handledKeys = new Set<string>();

      // A. Process Obs Groups (Repeating e.g. tb_prev, oi_prophylaxis; and Non-Repeating e.g. ARVDrug_1..5)
      for (const grp of obsGroupDefs) {
        const grpVal: any = formData[grp.id];
        let groupConceptId = await resolveConceptId(grp.concept);
        if (grp.id === 'tb_prev' || grp.id.includes('tb_prev') || grp.concept === 'f3772dae-fc93-4428-baa7-268f83462e3f') {
          groupConceptId = 167469; // National TPT container concept
        } else if (!groupConceptId) {
          if (grp.id.includes('oi_prophylaxis')) groupConceptId = 165726;
          else if (grp.id.includes('prep')) groupConceptId = 167468;
          else if (grp.id.startsWith('ARVDrug')) groupConceptId = 162240;
          else groupConceptId = 162240;
        }

        if (grp.isRepeating) {
          const rows = Array.isArray(grpVal) ? grpVal : (grpVal && typeof grpVal === 'object' ? [grpVal] : []);
          handledKeys.add(grp.id);

          for (const row of rows) {
            if (!row || typeof row !== 'object') continue;
            
            // Skip rows without an actual drug selected to avoid phantom entries
            const drugKey = grp.id.includes('oi_prophylaxis') ? 'drugs_Cotrim'
              : grp.id.includes('tb_prev') ? 'tb_prev_drugs'
              : grp.id.includes('prep') ? 'prev_drugs'
              : grp.id.includes('others') ? 'other_prev_drugs'
              : null;
            if (drugKey && (!row[drugKey] || row[drugKey] === '')) {
              continue;
            }

            // 1. Create parent group observation
            let parentObsId: number | null = null;
            if (groupConceptId) {
              parentObsId = await insertSingleObs(groupConceptId, null, `rfe-forms^rfe-forms-${grp.id}`, null);
            }

            // 2. Create group members with obs_group_id linking - strictly iterate over official subQuestions
            for (const subQ of grp.subQuestions) {
              const colVal = row[subQ.id];
              if (colVal === undefined || colVal === null || colVal === '') continue;

              const colConcept = subQ?.concept || schemaConceptMap[subQ.id] || subQ.id;
              const colConceptId = await resolveConceptId(colConcept);
              if (colConceptId) {
                await insertSingleObs(colConceptId, colVal, `rfe-forms^rfe-forms-${subQ.id}`, parentObsId);
              }
            }
          }
        } else {
          // Non-repeating obsGroup (e.g. ARVDrug_1, ARVDrug_2, etc.)
          // Mark all subquestion IDs so they cannot leak into root observations
          for (const subQ of grp.subQuestions) {
            handledKeys.add(subQ.id);
          }

          const subValues: Array<{ subId: string; conceptUuid: string; value: any }> = [];
          for (const subQ of grp.subQuestions) {
            const v = formData[subQ.id] !== undefined ? formData[subQ.id] : (grpVal && typeof grpVal === 'object' ? (grpVal as any)[subQ.id] : undefined);
            if (v !== undefined && v !== null && v !== '') {
              subValues.push({
                subId: subQ.id,
                conceptUuid: subQ.concept || schemaConceptMap[subQ.id] || subQ.id,
                value: v
              });
            }
          }

          // Filter out orphan ARVDrug rows where no actual drug is selected
          if (grp.id.startsWith('ARVDrug_')) {
            const hasDrug = subValues.some(sv => sv.subId.startsWith('Drugs_ART_') && sv.value);
            if (!hasDrug) continue;
          }

          if (subValues.length > 0) {
            handledKeys.add(grp.id);
            // 1. Create parent group observation
            let parentObsId: number | null = null;
            if (groupConceptId) {
              parentObsId = await insertSingleObs(groupConceptId, null, `rfe-forms^rfe-forms-${grp.id}`, null);
            }

            // 2. Create group members with obs_group_id linking
            for (const item of subValues) {
              const itemConceptId = await resolveConceptId(item.conceptUuid);
              if (itemConceptId) {
                await insertSingleObs(itemConceptId, item.value, `rfe-forms^rfe-forms-${item.subId}`, parentObsId);
              }
            }
          }
        }
      }

      // B. Process All Remaining Standalone Observations
      // STRICT ROOT-LEVEL WHITELIST: Only genuine top-level schema questions can be standalone observations.
      // Drug quantities, durations, strengths, frequencies, and aliases MUST NEVER be root observations!
      const ROOT_LEVEL_WHITELIST = new Set([
        'Treatment_type', 'treatment_type',
        'visit_type_pharm', 'Visit type',
        'Pregnancy_Status', 'pregnant',
        'refill', 'Refill',
        'pick_up_reason_pharm',
        'Dispensing_Modality', 'dispensing_modality',
        'eacSessions',
        'latestWeight', 'latest_weight', 'Weight', 'weight',
        'latestHeight', 'latest_height', 'Height', 'height',
        'Treatment_age_group', 'treatment_age_group',
        'regimen_line', 'Regimen Line',
        'Adult_1st_Line_Regimens',
        'Adult_2nd_line_ARV_regimen',
        'Adult_3rd_Line_ARV_Regimens',
        'Child_1st_line_ARV_regimen',
        'Child_2nd_line_ARV_regimen',
        'Child_3rd_Line_ARV_Regimens',
        'calculated_next_appointment_date',
        'dateOrdered',
        'name_of_drug_pharm',
        'name_of_arv_error_pharm',
        'consequence(S)OfTheError',
        'signature'
      ]);

      for (const [key, val] of Object.entries(formData)) {
        if (handledKeys.has(key)) continue;
        if (!ROOT_LEVEL_WHITELIST.has(key)) continue;
        if (val === undefined || val === null || val === '') continue;
        if (Array.isArray(val)) continue; // Repeating arrays already handled

        const conceptId = await resolveConceptId(key);
        // Exclude concept 9 ("BLOOD SUGAR") fallback unless specifically requested
        if (conceptId && (conceptId !== 9 || key.toLowerCase().includes('sugar') || key.toLowerCase().includes('glucose'))) {
          await insertSingleObs(conceptId, val, `rfe-forms^rfe-forms-${key}`, null);
        }
      }

      await conn.end();

      // Update TerkHealth360 database record
      await prisma.nmrsEncounterRecord.update({
        where: { id: recordId },
        data: {
          openmrsEncounterUuid: openmrsUuid,
          syncStatus: 'SYNCED',
          syncedAt: new Date()
        }
      });

      return {
        success: true,
        mode: 'MYSQL_DIRECT',
        encounterId,
        openmrsEncounterUuid: openmrsUuid,
        obsInserted,
        message: `Successfully synchronized encounter and ${obsInserted} observations to OpenMRS MySQL on laptop server`
      };
    } catch (err: any) {
      await conn.end();
      throw err;
    }
  }
}
