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
import type { Contact, ExcelData, RowData } from '@/lib/types'; // Use central types
import { useDataSync } from '@/hooks/use-data-sync'; // Import the data sync hook
import { cn } from '@/lib/utils';

const FileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { initiateSync } = useDataSync(); // Use the data sync hook
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
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
          variant: "destructive",
        });
        setFile(null);
        event.target.value = ''; // Reset file input
      }
    } else {
      setFile(null);
    }
    }, [toast]);
    const [parsedData, setParsedData] = useState<ExcelData | null>(null);
    const [previewData, setPreviewData] = useState<RowData[]>([]);
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const handleUpload = useCallback(async () => {
        if (!file || !parsedData) {
            toast({
                title: "No File or Data Selected",
                description: "Please select a file and parse its data.",
                variant: "destructive",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
          
      let _parsedData: ExcelData;

        if (file.type === 'text/csv') {
            _parsedData = await parseCsv(file);
        } else {
            _parsedData = await parseExcel(file);
        }

        const requiredHeaders = ['firstName', 'lastName', 'email', 'phone']; // Define required headers
        const missingHeaders = requiredHeaders.filter(header => !_parsedData.headers.includes(header));

        if (missingHeaders.length > 0) { // Check for missing headers
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`); // Throw error if missing
        }

        setParsedData(_parsedData);
        setShowPreview(true);
        const preview = _parsedData.rows.slice(0, 5).map((row) => {
            const rowData: RowData = {};
            _parsedData.headers.forEach((header, index) => {
                rowData[header] = row[index];
            });
            return rowData;
        });
        setPreviewHeaders(_parsedData.headers);
        setPreviewData(preview);
        const contacts: Contact[] = _parsedData.rows.map(row => {
            const contact: Contact = {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
            };
            if (_parsedData.headers.includes('firstName')) {
                contact.firstName = row[_parsedData.headers.indexOf('firstName')];
            }
            if (_parsedData.headers.includes('lastName')) {
                contact.lastName = row[_parsedData.headers.indexOf('lastName')];
            }
            if(_parsedData.headers.includes('email')){
                contact.email = row[_parsedData.headers.indexOf('email')]
            }
            if(_parsedData.headers.includes('phone')){
                contact.phone = row[_parsedData.headers.indexOf('phone')]
            }
                return contact;        });
        // Store contacts in localStorage, sync to cloud later
        localStorage.setItem('contacts', JSON.stringify(contacts));
        
        // Trigger data sync
        await initiateSync();

        toast({
            title: "File Uploaded Successfully",
            description: `${_parsedData.rows.length} records imported.`,
        });

      // Redirect to data grid page after successful upload
        //router.push('/data-grid');

    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Error Processing File",
        description: "There was an issue parsing your file. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
    }, [file, toast, initiateSync]);

    const parseExcel = useCallback((file: File): Promise<ExcelData> => {
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

          const headers = jsonData[0].map(String); // First row as headers
          const rows = jsonData.slice(1).map(row => row.map(String)); // Remaining rows as data

          resolve({ headers, rows });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
    }, []); // Add dependencies

    const parseCsv = useCallback((file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false, // Read first row as data for now, extract headers manually
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as string[][];
          if (!data || data.length === 0) {
             return reject(new Error("CSV file is empty or invalid."));
          }
          const headers = data[0]; // First row as headers
          const rows = data.slice(1); // Remaining rows
          resolve({ headers, rows });
        },
        error: (error) => {
          reject(error);
        },
      });
    });
    }, []);

    const columns = useMemo(() => previewHeaders.map((header) => ({
        accessorKey: header,
        header: header,
    })), [previewHeaders]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
        <CardDescription>Select an Excel or CSV file containing customer data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="file-upload">Select File</Label>
          <Input id="file-upload" type="file" onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
        </div>
        {file && (
          <p className="text-sm text-muted-foreground">Selected file: {file.name}</p>
        )}
        {showPreview && parsedData && parsedData.rows.length > 0 && (
          <div>
            <h3 className="text-lg font-medium">Data Preview</h3>
            <p className="text-sm text-muted-foreground">
                Showing the first 5 records. Please confirm if the data looks correct before uploading.
            </p>
            {parsedData.rows.length > 0 && (

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                    {columns.map((column) => (
                        <TableHead key={column.accessorKey}>
                            {column.header}
                        </TableHead>
                    ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((rowData, index) => (
                        <TableRow key={index}>
                            {columns.map((column) => (
                                <TableCell key={`${index}-${column.accessorKey}`}>
                                    {rowData[column.accessorKey]}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpload} disabled={!file || isProcessing || !showPreview}>
          <Upload className="mr-2 h-4 w-4" /> {isProcessing ? 'Processing...' : 'Upload and Process'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;

