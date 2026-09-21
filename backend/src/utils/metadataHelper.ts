import fs from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), 'employees_metadata.json');

export interface EmployeeMetadata {
  id: string;
  phone?: string;
  salaryGrade?: string;
  baseSalary?: number;
  bankName?: string;
  accountNo?: string;
  pensionPin?: string;
  taxId?: string;
  designation?: string;
  fundingSource?: string;
  donorProgramme?: string;
  licenseExpiry?: string;
  status?: string;
  queries?: any[];
  [key: string]: any;
}

export function loadEmployeeMetadata(): Record<string, EmployeeMetadata> {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load employee metadata:', err);
  }
  return {};
}

export function saveEmployeeMetadata(metadata: Record<string, EmployeeMetadata>) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save employee metadata:', err);
  }
}
