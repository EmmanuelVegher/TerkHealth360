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
  public static async getConnectionConfig(): Promise<MySqlConfig> {
    const config = await prisma.nmrsConfig.findFirst({ where: { isActive: true } });
    let host = '10.11.2.29';
    let port = 3306;

    if (config?.openmrsBaseUrl) {
      try {
        const u = new URL(config.openmrsBaseUrl.startsWith('http') ? config.openmrsBaseUrl : `http://${config.openmrsBaseUrl}`);
        if (u.hostname) host = u.hostname;
      } catch {
        // fallback
      }
    }

    return {
      host: process.env.NMRS_MYSQL_HOST || host,
      port: Number(process.env.NMRS_MYSQL_PORT || port),
      user: process.env.NMRS_MYSQL_USER || 'root',
      password: process.env.NMRS_MYSQL_PASSWORD || 'Admin123',
      database: process.env.NMRS_MYSQL_DB || 'openmrs'
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
        `SELECT p.patient_id, p.uuid as patient_uuid,
                pi.identifier as art_number,
                pn.given_name, pn.family_name,
                per.gender, per.birthdate, per.dead, per.death_date, per.cause_of_death,
                pa.address1, pa.city_village, pa.state_province, pa.country
         FROM patient p
         JOIN patient_identifier pi ON p.patient_id = pi.patient_id AND pi.voided = 0
         JOIN person per ON p.patient_id = per.person_id AND per.voided = 0
         LEFT JOIN person_name pn ON per.person_id = pn.person_id AND pn.preferred = 1
         LEFT JOIN person_address pa ON per.person_id = pa.person_id AND pa.preferred = 1
         WHERE pi.identifier = ? OR p.uuid = ? OR p.patient_id = ?
         LIMIT 1`,
        [cleanKey, cleanKey, cleanKey]
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

      // 5. Fetch all observations
      const [observations]: any = await conn.execute(
        `SELECT o.encounter_id, o.concept_id, o.obs_datetime,
                cn.name as concept_name,
                o.value_numeric, o.value_text, o.value_datetime, o.value_coded,
                cvn.name as coded_value_name
         FROM obs o
         LEFT JOIN concept_name cn ON o.concept_id = cn.concept_id AND cn.locale = 'en' AND cn.concept_name_type = 'FULLY_SPECIFIED'
         LEFT JOIN concept_name cvn ON o.value_coded = cvn.concept_id AND cvn.locale = 'en' AND cvn.concept_name_type = 'FULLY_SPECIFIED'
         WHERE o.person_id = ? AND o.voided = 0`,
        [patientId]
      );

      await conn.end();

      // Group observations by encounter_id
      const obsByEnc = new Map<number, Record<string, any>>();
      for (const o of observations) {
        if (!obsByEnc.has(o.encounter_id)) {
          obsByEnc.set(o.encounter_id, {});
        }
        const dict = obsByEnc.get(o.encounter_id)!;
        const conceptLabel = o.concept_name || CIEL_CONCEPT_ID_MAP[o.concept_id] || `Concept #${o.concept_id}`;
        let val: any = o.coded_value_name || o.value_numeric || o.value_text;
        if (o.value_datetime) val = new Date(o.value_datetime).toISOString().split('T')[0];
        if (val !== undefined && val !== null) {
          dict[conceptLabel] = val;
        }
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
}
