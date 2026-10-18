/**
 * NHTDAO Layer 4 — DHIS2 / NHMIS / OpenHEXA Public Health Client
 *
 * Implements standard DHIS2 Web API v2.30+ dataValueSets exchange format.
 * Supports both HTTP Basic Authentication and Personal Access Token (PAT).
 */

export interface Dhis2ClientConfig {
  baseUrl: string;
  authType?: 'BASIC' | 'PAT';
  username?: string | null;
  password?: string | null;
  personalAccessToken?: string | null;
  orgUnitUid?: string | null;
  dataSetUid?: string | null;
  attributeOptionComboUid?: string | null;
}

export interface Dhis2DataValue {
  dataElement: string;
  categoryOptionCombo?: string;
  value: string | number;
  comment?: string;
}

export interface Dhis2DataValueSetPayload {
  dataSet?: string;
  completeDate?: string;
  period: string; // e.g. "202609"
  orgUnit: string;
  attributeOptionCombo?: string;
  dataValues: Dhis2DataValue[];
}

export interface Dhis2ImportCount {
  imported: number;
  updated: number;
  ignored: number;
  deleted: number;
}

export interface Dhis2ImportSummary {
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  description?: string;
  importCount: Dhis2ImportCount;
  conflicts?: Array<{ object: string; value: string }>;
  raw?: any;
}

export class Dhis2Client {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: Dhis2ClientConfig) {
    this.baseUrl = (config.baseUrl || '').replace(/\/+$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (config.authType === 'PAT' && config.personalAccessToken) {
      this.headers.Authorization = `ApiToken ${config.personalAccessToken.trim()}`;
    } else if (config.username && config.password) {
      const credentials = Buffer.from(`${config.username.trim()}:${config.password}`).toString('base64');
      this.headers.Authorization = `Basic ${credentials}`;
    }
  }

  /**
   * Tests live reachability and authenticates against the DHIS2 instance.
   */
  async testConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    systemInfo?: { version: string; serverDate: string; systemName: string };
    userInfo?: { id: string; username: string; name: string };
    message: string;
  }> {
    const startTime = Date.now();
    try {
      const infoUrl = `${this.baseUrl}/api/system/info`;
      const res = await fetch(infoUrl, {
        method: 'GET',
        headers: this.headers,
        signal: AbortSignal.timeout(10000),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          message: `DHIS2 responded with HTTP status ${res.status}: ${res.statusText}`,
        };
      }

      const infoData: any = await res.json();

      let userInfo: any = undefined;
      try {
        const meRes = await fetch(`${this.baseUrl}/api/me`, {
          method: 'GET',
          headers: this.headers,
          signal: AbortSignal.timeout(5000),
        });
        if (meRes.ok) {
          const meData: any = await meRes.json();
          userInfo = {
            id: meData.id,
            username: meData.username || meData.userCredentials?.username,
            name: meData.name || meData.displayName,
          };
        }
      } catch (_) {}

      return {
        success: true,
        latencyMs,
        systemInfo: {
          version: infoData.version || 'Unknown',
          serverDate: infoData.serverDate || new Date().toISOString(),
          systemName: infoData.systemName || 'DHIS2 Instance',
        },
        userInfo,
        message: `Successfully connected to DHIS2 v${infoData.version || ''} in ${latencyMs}ms`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: err.message || 'Failed to reach DHIS2 server',
      };
    }
  }

  /**
   * Fetches organisation units accessible to the credential.
   */
  async getOrganisationUnits(query = ''): Promise<any[]> {
    const params = new URLSearchParams({
      fields: 'id,name,code,level',
      paging: 'false',
    });
    if (query) params.set('filter', `name:ilike:${query}`);

    const res = await fetch(`${this.baseUrl}/api/organisationUnits?${params.toString()}`, {
      headers: this.headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`DHIS2 OrganisationUnits request failed: ${res.statusText}`);
    const data: any = await res.json();
    return data.organisationUnits || [];
  }

  /**
   * Fetches data sets configured in the DHIS2 instance.
   */
  async getDataSets(): Promise<any[]> {
    const params = new URLSearchParams({
      fields: 'id,name,code,periodType',
      paging: 'false',
    });
    const res = await fetch(`${this.baseUrl}/api/dataSets?${params.toString()}`, {
      headers: this.headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`DHIS2 DataSets request failed: ${res.statusText}`);
    const data: any = await res.json();
    return data.dataSets || [];
  }

  /**
   * Submits aggregate DataValueSet payload to DHIS2.
   * Supports `dryRun=true` to validate data elements and categories without writing to the database.
   */
  async submitDataValueSet(
    payload: Dhis2DataValueSetPayload,
    dryRun = false
  ): Promise<Dhis2ImportSummary> {
    const url = `${this.baseUrl}/api/dataValueSets?dryRun=${dryRun ? 'true' : 'false'}&importStrategy=CREATE_AND_UPDATE`;

    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok && res.status !== 409) {
      throw new Error(`DHIS2 submission failed (${res.status}): ${data.message || res.statusText}`);
    }

    const summary = data.response || data;
    const count: Dhis2ImportCount = {
      imported: summary.importCount?.imported ?? 0,
      updated: summary.importCount?.updated ?? 0,
      ignored: summary.importCount?.ignored ?? 0,
      deleted: summary.importCount?.deleted ?? 0,
    };

    return {
      status: summary.status || (count.ignored > 0 && count.imported === 0 ? 'WARNING' : 'SUCCESS'),
      description: summary.description || (dryRun ? 'Validation Dry-Run Complete' : 'Submission Completed'),
      importCount: count,
      conflicts: summary.conflicts || [],
      raw: data,
    };
  }
}
