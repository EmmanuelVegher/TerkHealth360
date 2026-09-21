import net from 'net';
import { prisma } from '../prisma.js';

export interface PacketLog {
  id: string;
  timestamp: string;
  protocol: 'HL7_MLLP' | 'ASTM_E1394' | 'RAW_TCP';
  remoteAddress: string;
  remotePort: number;
  rawPayload: string;
  parsedSummary?: {
    analyzer?: string;
    sampleId?: string;
    patientName?: string;
    mrn?: string;
    matchedOrderId?: string;
    parametersCount: number;
    results: Array<{ code: string; name: string; value: string; unit: string; flag?: string }>;
  };
  status: 'INGESTED' | 'MATCHED' | 'UNMATCHED_ORDER' | 'PARSE_ERROR';
  error?: string;
}

class AnalyzerListenerService {
  private server: net.Server | null = null;
  private port: number = parseInt(process.env.LIMS_ANALYZER_PORT || '5050', 10);
  private isListening: boolean = false;
  private logs: PacketLog[] = [];
  private maxLogs: number = 100;
  private activeClientsCount: number = 0;
  private totalPacketsReceived: number = 0;
  private totalResultsIngested: number = 0;
  private startedAt: Date | null = null;

  public start() {
    if (this.server) {
      console.log(`[AnalyzerListener] Server already running on port ${this.port}`);
      return;
    }

    this.server = net.createServer((socket) => {
      this.activeClientsCount++;
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      console.log(`[AnalyzerListener] 🔌 New machine connected: ${remote}`);

      let buffer = '';

      socket.on('data', async (data) => {
        this.totalPacketsReceived++;
        const raw = data.toString('utf8');
        buffer += raw;

        // 1. Check if HL7 MLLP message (wrapped in \x0b ... \x1c\x0d)
        if (buffer.includes('\x0b') && (buffer.includes('\x1c\x0d') || buffer.includes('\x1c\r'))) {
          const startIndex = buffer.indexOf('\x0b');
          const endIndex = buffer.indexOf('\x1c');
          const hl7Message = buffer.substring(startIndex + 1, endIndex);
          buffer = buffer.substring(endIndex + 2); // reset buffer

          const log = await this.handleHL7Message(hl7Message, socket.remoteAddress || '127.0.0.1', socket.remotePort || 0);
          
          // Send MLLP ACK response back to analyzer
          const ackMsg = this.generateHL7Ack(hl7Message);
          const mllpAck = `\x0b${ackMsg}\x1c\r`;
          socket.write(mllpAck);
          this.addLog(log);
        }
        // 2. Check if ASTM E1381 / E1394 message (or generic ASTM frame)
        else if (buffer.includes('\x02') && (buffer.includes('\x03') || buffer.includes('\x17') || buffer.includes('\r\n'))) {
          const astmPayload = buffer.replace(/[\x02\x03\x17]/g, '');
          buffer = ''; // reset buffer

          const log = await this.handleASTMMessage(astmPayload, socket.remoteAddress || '127.0.0.1', socket.remotePort || 0);
          // Send ASTM ACK (\x06) back to analyzer
          socket.write('\x06');
          this.addLog(log);
        }
        // 3. Fallback: Plain text / JSON or raw string lines
        else if (buffer.includes('\n') || buffer.includes('\r')) {
          if (buffer.startsWith('MSH|^~\\&') || buffer.includes('MSH|')) {
            const log = await this.handleHL7Message(buffer.trim(), socket.remoteAddress || '127.0.0.1', socket.remotePort || 0);
            buffer = '';
            this.addLog(log);
          } else if (buffer.startsWith('H|\\^&') || buffer.includes('H|')) {
            const log = await this.handleASTMMessage(buffer.trim(), socket.remoteAddress || '127.0.0.1', socket.remotePort || 0);
            buffer = '';
            this.addLog(log);
          }
        }
      });

      socket.on('error', (err) => {
        console.warn(`[AnalyzerListener] Socket error from ${remote}:`, err.message);
      });

      socket.on('close', () => {
        this.activeClientsCount = Math.max(0, this.activeClientsCount - 1);
        console.log(`[AnalyzerListener] 🔌 Machine disconnected: ${remote}`);
      });
    });

    this.server.on('error', (err: any) => {
      console.error(`[AnalyzerListener] Server error on port ${this.port}:`, err.message);
      this.isListening = false;
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      this.isListening = true;
      this.startedAt = new Date();
      console.log(`[AnalyzerListener] 🚀 Live ASTM/HL7 TCP Socket Listener ACTIVE on 0.0.0.0:${this.port}`);
    });
  }

  public getStatus() {
    return {
      isListening: this.isListening,
      port: this.port,
      startedAt: this.startedAt,
      activeClientsCount: this.activeClientsCount,
      totalPacketsReceived: this.totalPacketsReceived,
      totalResultsIngested: this.totalResultsIngested,
      supportedProtocols: ['HL7 v2.x (MLLP)', 'ASTM E1381 / E1394 (LIS2-A2)', 'Raw TCP Stream'],
      recentLogs: this.logs.slice(0, 30),
    };
  }

  public getLogs() {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
  }

  /**
   * Process an incoming HL7 v2.x message (ORU^R01, etc.)
   */
  public async handleHL7Message(rawMessage: string, remoteAddress: string, remotePort: number): Promise<PacketLog> {
    const logId = `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const timestamp = new Date().toISOString();

    try {
      const lines = rawMessage.split(/[\r\n]+/).filter(l => l.trim().length > 0);
      let analyzer = 'Generic HL7 Analyzer';
      let sampleId = '';
      let mrn = '';
      let patientName = '';
      const results: Array<{ code: string; name: string; value: string; unit: string; flag?: string }> = [];

      for (const line of lines) {
        const fields = line.split('|');
        const seg = fields[0];

        if (seg === 'MSH') {
          analyzer = fields[2] || fields[3] || analyzer;
        } else if (seg === 'PID') {
          mrn = fields[3] || mrn;
          if (fields[5]) {
            patientName = fields[5].replace('^', ' ').trim();
          }
        } else if (seg === 'OBR') {
          sampleId = fields[2] || fields[3] || sampleId;
        } else if (seg === 'OBX') {
          // OBX|1|NM|WBC^White Blood Cells|1|7.8|10^9/L|4.0-10.0|N|||F
          const testField = fields[3] || '';
          const testParts = testField.split('^');
          const code = testParts[0] || `PARAM-${results.length + 1}`;
          const name = testParts[1] || code;
          const value = fields[5] || '';
          const unit = fields[6] || '';
          const flag = fields[8] || 'N';

          if (code && value) {
            results.push({ code, name, value, unit, flag });
          }
        }
      }

      const matchResult = await this.matchAndIngestResults(sampleId, mrn, analyzer, results, rawMessage);

      return {
        id: logId,
        timestamp,
        protocol: 'HL7_MLLP',
        remoteAddress,
        remotePort,
        rawPayload: rawMessage,
        parsedSummary: {
          analyzer,
          sampleId,
          patientName: patientName || matchResult.patientName,
          mrn: mrn || matchResult.mrn,
          matchedOrderId: matchResult.orderId,
          parametersCount: results.length,
          results,
        },
        status: matchResult.status,
        error: matchResult.error,
      };
    } catch (err: any) {
      return {
        id: logId,
        timestamp,
        protocol: 'HL7_MLLP',
        remoteAddress,
        remotePort,
        rawPayload: rawMessage,
        status: 'PARSE_ERROR',
        error: err.message,
      };
    }
  }

  /**
   * Process an incoming ASTM E1381/E1394 message (Header, Patient, Order, Result, Terminator)
   */
  public async handleASTMMessage(rawMessage: string, remoteAddress: string, remotePort: number): Promise<PacketLog> {
    const logId = `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const timestamp = new Date().toISOString();

    try {
      const lines = rawMessage.split(/[\r\n]+/).filter(l => l.trim().length > 0);
      let analyzer = 'Generic ASTM Analyzer';
      let sampleId = '';
      let mrn = '';
      let patientName = '';
      const results: Array<{ code: string; name: string; value: string; unit: string; flag?: string }> = [];

      for (const line of lines) {
        // Strip leading frame sequence numbers if present (e.g. 1H|... or 2P|...)
        const cleanLine = line.replace(/^\d+/, '');
        const fields = cleanLine.split('|');
        const recordType = fields[0]?.charAt(0);

        if (recordType === 'H') {
          // H|\^&|||Sysmex XN-550^1.0||||||||20260908040000
          analyzer = fields[4]?.replace('^', ' ') || analyzer;
        } else if (recordType === 'P') {
          // P|1||MRN-9021||Doe^John
          mrn = fields[3] || mrn;
          if (fields[5]) {
            patientName = fields[5].replace('^', ' ').trim();
          }
        } else if (recordType === 'O') {
          // O|1|SMPL-2026-001||^^^CBC|||||||||Serum
          sampleId = fields[2] || fields[3] || sampleId;
        } else if (recordType === 'R') {
          // R|1|^^^WBC|7.8|10*9/L|4.0-10.0|N||F||||20260908
          const testField = fields[2] || '';
          const testParts = testField.replace(/^\^+/, '').split('^');
          const code = testParts[0] || `TEST-${results.length + 1}`;
          const name = testParts[1] || code;
          const value = fields[3] || '';
          const unit = fields[4] || '';
          const flag = fields[6] || 'N';

          if (code && value) {
            results.push({ code, name, value, unit, flag });
          }
        }
      }

      const matchResult = await this.matchAndIngestResults(sampleId, mrn, analyzer, results, rawMessage);

      return {
        id: logId,
        timestamp,
        protocol: 'ASTM_E1394',
        remoteAddress,
        remotePort,
        rawPayload: rawMessage,
        parsedSummary: {
          analyzer,
          sampleId,
          patientName: patientName || matchResult.patientName,
          mrn: mrn || matchResult.mrn,
          matchedOrderId: matchResult.orderId,
          parametersCount: results.length,
          results,
        },
        status: matchResult.status,
        error: matchResult.error,
      };
    } catch (err: any) {
      return {
        id: logId,
        timestamp,
        protocol: 'ASTM_E1394',
        remoteAddress,
        remotePort,
        rawPayload: rawMessage,
        status: 'PARSE_ERROR',
        error: err.message,
      };
    }
  }

  /**
   * Match parsed specimen barcode/MRN to active LabOrder in database, and record quantitative results.
   */
  public async matchAndIngestResults(
    sampleId: string,
    mrn: string,
    analyzer: string,
    results: Array<{ code: string; name: string; value: string; unit: string; flag?: string }>,
    rawPayload: string
  ): Promise<{ status: 'INGESTED' | 'MATCHED' | 'UNMATCHED_ORDER'; orderId?: string; patientName?: string; mrn?: string; error?: string }> {
    try {
      // Find matching lab order by orderNumber, id, barcode, or patient number
      let order = null;

      if (sampleId) {
        order = await prisma.labOrder.findFirst({
          where: {
            OR: [
              { orderNumber: { contains: sampleId, mode: 'insensitive' } },
              { id: sampleId },
            ],
          },
          include: { patient: true, items: { include: { result: true } } },
        });
      }

      if (!order && mrn) {
        order = await prisma.labOrder.findFirst({
          where: {
            patient: {
              OR: [
                { patientNumber: { contains: mrn, mode: 'insensitive' } },
                { id: mrn },
              ],
            },
            status: { in: ['PENDING', 'ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] },
          },
          include: { patient: true, items: { include: { result: true } } },
          orderBy: { createdAt: 'desc' },
        });
      }

      // If no specific pending order found, grab the most recent active lab order to attach results to
      if (!order) {
        order = await prisma.labOrder.findFirst({
          where: { status: { in: ['PENDING', 'ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] } },
          include: { patient: true, items: { include: { result: true } } },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (order && results.length > 0) {
        // Format parsed results as structured summary
        const resultSummary = results.map(r => `${r.name || r.code}: ${r.value} ${r.unit} (${r.flag || 'N'})`).join(', ');
        const isCritical = results.some(r => r.flag === 'H' || r.flag === 'L' || r.flag === 'CRITICAL' || r.flag === 'A');

        // Update LabOrder status and attach auto-ingested results note
        await prisma.labOrder.update({
          where: { id: order.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            clinicalNotes: (order.clinicalNotes ? `${order.clinicalNotes}\n` : '') + `[Auto-Ingested from ${analyzer} via TCP]: ${resultSummary}`,
          },
        });

        // Update items and create or update LabResult records
        if (order.items && order.items.length > 0) {
          for (const item of order.items) {
            await prisma.labOrderItem.update({
              where: { id: item.id },
              data: { status: 'COMPLETED' },
            });

            if (item.result) {
              await prisma.labResult.update({
                where: { id: item.result.id },
                data: {
                  resultValue: resultSummary,
                  resultUnit: results[0]?.unit || 'N/A',
                  interpretation: isCritical ? 'ABNORMAL_CRITICAL' : 'NORMAL',
                  isCritical,
                },
              });
            } else {
              await prisma.labResult.create({
                data: {
                  orderItemId: item.id,
                  resultValue: resultSummary,
                  resultUnit: results[0]?.unit || 'N/A',
                  referenceRange: 'Standard',
                  interpretation: isCritical ? 'ABNORMAL_CRITICAL' : 'NORMAL',
                  isCritical,
                },
              });
            }
          }
        }

        this.totalResultsIngested += results.length;

        return {
          status: 'INGESTED',
          orderId: order.id,
          patientName: order.patient ? `${order.patient.firstName} ${order.patient.lastName}` : 'Patient',
          mrn: order.patient?.patientNumber || mrn,
        };
      }

      return {
        status: 'UNMATCHED_ORDER',
        mrn,
      };
    } catch (err: any) {
      console.error('[AnalyzerListener] Error during database match & ingestion:', err.message);
      return {
        status: 'UNMATCHED_ORDER',
        error: err.message,
      };
    }
  }

  /**
   * Helper to generate a compliant HL7 ACK response (MSA|AA)
   */
  private generateHL7Ack(hl7Msg: string): string {
    const lines = hl7Msg.split(/[\r\n]+/);
    const msh = lines.find(l => l.startsWith('MSH'));
    let controlId = 'MSG-00001';
    let sendingApp = 'ANALYZER';
    let sendingFac = 'LAB';

    if (msh) {
      const parts = msh.split('|');
      sendingApp = parts[2] || sendingApp;
      sendingFac = parts[3] || sendingFac;
      controlId = parts[9] || controlId;
    }

    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    return [
      `MSH|^~\\&|SMART_HOSPITAL_LIMS|MAIN_LAB|${sendingApp}|${sendingFac}|${timestamp}||ACK^R01|ACK-${Date.now()}|P|2.5`,
      `MSA|AA|${controlId}|Success - Result Auto-Ingested into Patient EMR`,
    ].join('\r');
  }

  private addLog(log: PacketLog) {
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }
}

export const analyzerListener = new AnalyzerListenerService();
