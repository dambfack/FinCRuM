'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import type { ExcelData } from '@/lib/types'; // Use central types

const FileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      let parsedData: ExcelData;

      if (file.type === 'text/csv') {
        parsedData = await parseCsv(file);
      } else {
        parsedData = await parseExcel(file);
      }

      // Store data in localStorage (replace with better state management/API call later)
      localStorage.setItem('customerData', JSON.stringify(parsedData));

      toast({
        title: "File Uploaded Successfully",
        description: `${parsedData.rows.length} records imported.`,
      });

      // Redirect to data grid page after successful upload
      router.push('/data-grid');

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
  };

  const parseExcel = (file: File): Promise<ExcelData> => {
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
  };

  const parseCsv = (file: File): Promise<ExcelData> => {
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
  };

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
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpload} disabled={!file || isProcessing}>
          <Upload className="mr-2 h-4 w-4" /> {isProcessing ? 'Processing...' : 'Upload and Process'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;

