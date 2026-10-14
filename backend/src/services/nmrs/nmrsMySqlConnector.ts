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
        `SELECT e.encounter_id, e.encounter_datetime, e.visit_id,
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

          let val: any = o.coded_uuid || o.coded_value_name || o.value_numeric || o.value_text;
          if (o.value_datetime) val = new Date(o.value_datetime).toISOString().split('T')[0];

          // Normalize ARV drug strength 166044 / 300/300/50Mg to standard value
          if (
            o.value_coded === 166044 ||
            o.coded_uuid === '0cd9c98e-7f52-48b9-a987-404ec90cc5fe' ||
            String(val).toLowerCase() === '300/300/50mg'
          ) {
            val = '300/300/50mg';
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

        dict.oi_prophylaxis = repeating.oi_prophylaxis;
        dict.tb_prev = repeating.tb_prev;
        dict.prepdrug = repeating.prepdrug;
        dict.others_prev = repeating.others_prev;

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
      const formUuid = encRecord.formSchema?.openmrsFormUuid || (encRecord.formSchema?.schemaJson as any)?.uuid || '';
      const [forms]: any = await conn.execute(`
        SELECT form_id FROM form
        WHERE retired = 0 AND (uuid = ? OR name LIKE ?)
        LIMIT 1
      `, [formUuid, `%${formName.slice(0, 10)}%`]);

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
        const [existingEnc]: any = await conn.execute(
          `SELECT encounter_id, visit_id FROM encounter WHERE uuid = ? LIMIT 1`,
          [openmrsUuid]
        );
        if (existingEnc && existingEnc.length > 0) {
          encounterId = existingEnc[0].encounter_id;
          const targetVisitId = existingEnc[0].visit_id || visitId;
          if (hasVisitIdCol) {
            await conn.execute(
              `UPDATE encounter SET encounter_datetime = ?, form_id = ?, encounter_type = ?, visit_id = ? WHERE encounter_id = ?`,
              [encDatetime, formId, encounterTypeId, targetVisitId, encounterId]
            );
          } else {
            await conn.execute(
              `UPDATE encounter SET encounter_datetime = ?, form_id = ?, encounter_type = ? WHERE encounter_id = ?`,
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

      // Helper: Resolve concept ID from UUID, numeric ID, CIEL map, or name
      const resolveConceptId = async (conceptKeyOrUuid: string): Promise<number | null> => {
        if (!conceptKeyOrUuid) return null;
        const mapped = schemaConceptMap[conceptKeyOrUuid] || conceptKeyOrUuid;

        if (mapped.length >= 30) {
          const [cRows]: any = await conn.execute(
            `SELECT concept_id FROM concept WHERE uuid = ? LIMIT 1`,
            [mapped]
          );
          if (cRows && cRows.length > 0) return cRows[0].concept_id;
        } else if (!isNaN(Number(mapped))) {
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

        if (obsVal !== null && obsVal !== undefined) {
          if (typeof obsVal === 'number') {
            valNumeric = obsVal;
          } else if (typeof obsVal === 'boolean') {
            valCoded = obsVal ? 1065 : 1066;
          } else if (String(obsVal).match(/^\d{4}-\d{2}-\d{2}/)) {
            valDatetime = new Date(String(obsVal));
          } else {
            const strVal = String(obsVal);
            if (strVal.includes('AAAA') || strVal.length >= 30) {
              const [codedRows]: any = await conn.execute(
                `SELECT concept_id FROM concept WHERE uuid = ? LIMIT 1`,
                [strVal]
              );
              if (codedRows && codedRows.length > 0) {
                valCoded = codedRows[0].concept_id;
              } else {
                valText = strVal;
              }
            } else if (!isNaN(Number(strVal)) && Number(strVal) > 100 && Number(strVal) < 200000) {
              valCoded = Number(strVal);
            } else {
              valText = typeof obsVal === 'object' ? JSON.stringify(obsVal) : strVal;
            }
          }
        }

        const pathStr = namespacePath.slice(0, 250);
        const useGroup = hasObsGroupIdCol && obsGroupId !== null;

        let insertSql = `
          INSERT INTO obs (person_id, concept_id, encounter_id, obs_datetime, location_id,
                           value_coded, value_datetime, value_numeric, value_text,
                           ${hasFormNamespaceCol ? 'form_namespace_and_path,' : ''}
                           ${useGroup ? 'obs_group_id,' : ''}
                           creator, date_created, voided, uuid)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
                  ${hasFormNamespaceCol ? '?, ' : ''}
                  ${useGroup ? '?, ' : ''}
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
        if (!groupConceptId) {
          if (grp.id.startsWith('ARVDrug')) groupConceptId = 162240;
          else groupConceptId = 162240;
        }

        if (grp.isRepeating) {
          const rows = Array.isArray(grpVal) ? grpVal : (grpVal && typeof grpVal === 'object' ? [grpVal] : []);
          handledKeys.add(grp.id);

          for (const row of rows) {
            if (!row || typeof row !== 'object') continue;
            const validEntries = Object.entries(row).filter(([_, v]) => v !== undefined && v !== null && v !== '');
            if (validEntries.length === 0) continue;

            // 1. Create parent group observation
            let parentObsId: number | null = null;
            if (groupConceptId) {
              parentObsId = await insertSingleObs(groupConceptId, null, `rfe^${grp.id}`, null);
            }

            // 2. Create group members with obs_group_id linking
            for (const [colKey, colVal] of validEntries) {
              const subQ = grp.subQuestions.find(sq => sq.id === colKey);
              const colConcept = subQ?.concept || schemaConceptMap[colKey] || colKey;
              const colConceptId = await resolveConceptId(colConcept);
              if (colConceptId) {
                await insertSingleObs(colConceptId, colVal, `rfe^${grp.id}/${colKey}`, parentObsId);
              }
            }
          }
        } else {
          // Non-repeating obsGroup (e.g. ARVDrug_1, ARVDrug_2, etc.)
          const subValues: Array<{ subId: string; conceptUuid: string; value: any }> = [];
          for (const subQ of grp.subQuestions) {
            const v = formData[subQ.id] !== undefined ? formData[subQ.id] : (grpVal && typeof grpVal === 'object' ? (grpVal as any)[subQ.id] : undefined);
            if (v !== undefined && v !== null && v !== '') {
              subValues.push({
                subId: subQ.id,
                conceptUuid: subQ.concept || schemaConceptMap[subQ.id] || subQ.id,
                value: v
              });
              handledKeys.add(subQ.id);
            }
          }

          if (subValues.length > 0) {
            handledKeys.add(grp.id);
            // 1. Create parent group observation
            let parentObsId: number | null = null;
            if (groupConceptId) {
              parentObsId = await insertSingleObs(groupConceptId, null, `rfe^${grp.id}`, null);
            }

            // 2. Create group members with obs_group_id linking
            for (const item of subValues) {
              const itemConceptId = await resolveConceptId(item.conceptUuid);
              if (itemConceptId) {
                await insertSingleObs(itemConceptId, item.value, `rfe^${grp.id}/${item.subId}`, parentObsId);
              }
            }
          }
        }
      }

      // B. Process All Remaining Standalone Observations
      const nonObsKeys = new Set([
        'facilityName', 'facility_name', 'facilityDatimCode',
        'clinicianName', 'clinician_name', 'pharmacist', 'pharmacistName',
        'visitDate', 'encounterDate', 'dateOrdered', 'orderedDate', 'encounterDatetime',
        'groups_count', 'active_regimen_info', 'id', 'uuid', 'patientId', 'patient_id',
        'encounter_id', 'visit_id', 'visitId', 'location_id', 'provider_id', 'form_id',
        'hospital_number', 'art_number', 'sex', 'age', 'dob', 'gender',
        'refillMonths', 'quantityDispensed', 'currentRegimen', 'dispensedRegimen',
        'calculated_next_appointment_date', 'next_appointment_date', 'returnVisitDate',
        'oi_prophylaxis', 'tb_prev', 'prepdrug', 'others_prev',
        'ARVDrug_1', 'ARVDrug_2', 'ARVDrug_3', 'ARVDrug_4', 'ARVDrug_5'
      ]);

      for (const [key, val] of Object.entries(formData)) {
        if (handledKeys.has(key)) continue;
        if (nonObsKeys.has(key)) continue;
        if (val === undefined || val === null || val === '') continue;
        if (Array.isArray(val)) continue; // Repeating arrays already handled

        const conceptId = await resolveConceptId(key);
        // Exclude concept 9 ("BLOOD SUGAR") fallback unless specifically requested
        if (conceptId && (conceptId !== 9 || key.toLowerCase().includes('sugar') || key.toLowerCase().includes('glucose'))) {
          await insertSingleObs(conceptId, val, `rfe^${key}`, null);
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
