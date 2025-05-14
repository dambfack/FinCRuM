'use client';

import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Contact, ExcelData } from '@/lib/types'; // Use central types, removed RowData as it's internal
import { useDataSync } from '@/hooks/use-data-sync';
import { cn } from '@/lib/utils';
import { DataItemType } from '@/lib/types'; // Import DataItemType

const FileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { performSync } = useDataSync(); // Use performSync

  const [parsedData, setParsedData] = useState<ExcelData | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ];

      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        // Automatically try to parse and show preview
        processAndPreviewFile(selectedFile);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
          variant: "destructive",
        });
        setFile(null);
        setShowPreview(false);
        event.target.value = '';
      }
    } else {
      setFile(null);
      setShowPreview(false);
    }
  }, [toast]); // processAndPreviewFile will be defined later or memoized

  const parseExcel = useCallback((fileToParse: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (!jsonData || jsonData.length === 0) {
            return reject(new Error("Excel file is empty or invalid."));
          }
          const headers = jsonData[0].map(String);
          const rows = jsonData.slice(1).map(row => row.map(String));
          resolve({ headers, rows });
        } catch (error) { reject(error); }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(fileToParse);
    });
  }, []);

  const parseCsv = useCallback((fileToParse: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
      Papa.parse(fileToParse, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as string[][];
          if (!data || data.length === 0) {
            return reject(new Error("CSV file is empty or invalid."));
          }
          const headers = data[0];
          const rows = data.slice(1);
          resolve({ headers, rows });
        },
        error: (error) => reject(error),
      });
    });
  }, []);

  const processAndPreviewFile = useCallback(async (fileToProcess: File) => {
    setIsProcessing(true);
    setShowPreview(false);
    try {
      let data: ExcelData;
      if (fileToProcess.type === 'text/csv') {
        data = await parseCsv(fileToProcess);
      } else {
        data = await parseExcel(fileToProcess);
      }

      // Basic validation for required headers can be added here if needed
      // e.g., const requiredHeaders = ['firstName', 'lastName', 'email'];
      // const missingHeaders = requiredHeaders.filter(h => !data.headers.includes(h));
      // if (missingHeaders.length > 0) {
      //   throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      // }

      setParsedData(data);
      setPreviewHeaders(data.headers);
      setPreviewData(data.rows.slice(0, 5).map(row => {
        const rowObj: Record<string, string> = {};
        data.headers.forEach((header, index) => {
          rowObj[header] = row[index] || ''; // Ensure value exists
        });
        return rowObj;
      }));
      setShowPreview(true);
      toast({
        title: "File Ready for Import",
        description: "Preview loaded. Review and click 'Import Data' to save.",
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Error Parsing File",
        description: (error instanceof Error ? error.message : "Could not parse the file."),
        variant: "destructive",
      });
      setParsedData(null);
      setShowPreview(false);
    } finally {
      setIsProcessing(false);
    }
  }, [parseCsv, parseExcel, toast]);


  const handleImport = useCallback(async () => {
    if (!parsedData) {
      toast({
        title: "No Data to Import",
        description: "Please select and parse a file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Transform parsedData to Contact[]
      const newContacts: Contact[] = parsedData.rows.map((row, i) => {
        const contact: Partial<Contact> = { id: `imported-${Date.now()}-${i}` };
        parsedData.headers.forEach((header, index) => {
          // Simple mapping, assuming headers match Contact properties or need adjustment
          if (header === 'firstName' || header === 'lastName' || header === 'email' || header === 'phone' || header === 'company' || header === 'address' || header === 'notes') {
            (contact as any)[header] = row[index];
          }
        });
        contact.createdAt = new Date().toISOString();
        contact.updatedAt = new Date().toISOString();
        return contact as Contact; // Assert as Contact after filling
      });

      // Retrieve existing contacts and merge (simple append for now, could add deduplication)
      const existingContacts = localStorage.getItem(DataItemType.Contacts);
      const allContacts = existingContacts ? JSON.parse(existingContacts) as Contact[] : [];
      allContacts.push(...newContacts);

      localStorage.setItem(DataItemType.Contacts, JSON.stringify(allContacts));

      // Also update customerData (ExcelData format) if it's used elsewhere for display
      localStorage.setItem(DataItemType.CustomerData, JSON.stringify(parsedData));

      toast({
        title: "Data Imported Successfully",
        description: `${newContacts.length} new records added. Existing records kept.`,
      });

      await performSync(); // Trigger sync after successful import

      // Optionally clear file and preview
      setFile(null);
      setShowPreview(false);
      setParsedData(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';


    } catch (error) {
      console.error('Error importing data:', error);
      toast({
        title: "Import Error",
        description: (error instanceof Error ? error.message : "Could not import data."),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [parsedData, toast, performSync]);


  const columns = useMemo(() => previewHeaders.map((header) => ({
    accessorKey: header,
    header: header,
  })), [previewHeaders]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Upload File</CardTitle> {/* Removed tracking-wide */}
        <CardDescription>Select an Excel or CSV file. Data will be previewed below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="file-upload">Select File</Label>
          <Input id="file-upload" type="file" onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
        </div>
        {file && !showPreview && !isProcessing && (
          <p className="text-sm text-muted-foreground">File selected: {file.name}. Processing...</p>
        )}
        {isProcessing && <p className="text-sm text-muted-foreground">Processing file, please wait...</p>}

        {showPreview && previewData.length > 0 && (
          <div>
            <h3 className="text-lg font-medium font-heading">Data Preview (First 5 Rows)</h3> {/* Removed tracking-wide */}
            <div className="rounded-md border mt-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column.accessorKey}>{column.header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((column) => (
                        <TableCell key={`${rowIndex}-${column.accessorKey}`}>
                          {row[column.accessorKey]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {showPreview && previewData.length === 0 && parsedData && (
             <p className="text-sm text-muted-foreground">File parsed, but no data rows found (only headers or empty file).</p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleImport} disabled={!showPreview || !parsedData || isProcessing}>
          <Upload className="mr-2 h-4 w-4" /> {isProcessing ? 'Importing...' : 'Import Data & Sync'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;
