import React, { useRef } from 'react';
import { Button, Stack, CircularProgress } from '@mui/material';
import { FileDownload, FileUpload } from '@mui/icons-material';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useSnackbar } from 'notistack';

interface BulkImportExportProps {
  onImport: (data: any[]) => Promise<void>;
  templateData: Record<string, any>[];
  exportFileName: string;
  isImporting?: boolean;
}

export const BulkImportExport: React.FC<BulkImportExportProps> = ({ onImport, templateData, exportFileName, isImporting = false }) => {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportTemplate = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, `${exportFileName}.xlsx`);
    } catch (err: any) {
      enqueueSnackbar('Failed to export template: ' + err.message, { variant: 'error' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          if (results.errors.length > 0) {
            enqueueSnackbar('Error parsing CSV', { variant: 'error' });
            return;
          }
          await processData(results.data);
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          await processData(data);
        } catch (err: any) {
          enqueueSnackbar('Error parsing Excel: ' + err.message, { variant: 'error' });
        }
      };
      reader.readAsBinaryString(file);
    } else {
      enqueueSnackbar('Invalid file format. Please upload CSV or Excel.', { variant: 'error' });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processData = async (data: any[]) => {
    if (data.length === 0) {
      enqueueSnackbar('The uploaded file contains no data.', { variant: 'warning' });
      return;
    }
    try {
      await onImport(data);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || err.message || 'Import failed', { variant: 'error' });
    }
  };

  return (
    <Stack direction="row" spacing={1}>
      <Button 
        variant="outlined" 
        size="small" 
        startIcon={<FileDownload />} 
        onClick={handleExportTemplate}
        color="secondary"
      >
        Export Template
      </Button>
      <input 
        type="file" 
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
      <Button 
        variant="contained" 
        size="small" 
        startIcon={isImporting ? <CircularProgress size={16} color="inherit" /> : <FileUpload />} 
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        color="primary"
      >
        Bulk Import
      </Button>
    </Stack>
  );
};
