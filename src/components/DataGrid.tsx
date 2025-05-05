'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import type { ExcelData } from '@/lib/types'; // Use central types


const DataGrid = () => {
  const [data, setData] = useState<ExcelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure this code runs only on the client side
    try {
        const storedData = localStorage.getItem('customerData');
        if (storedData) {
            const parsedData: ExcelData = JSON.parse(storedData);
             if (parsedData && parsedData.headers && parsedData.rows) {
                 setData(parsedData);
             } else {
                 setError("No valid data found. Please import a file.");
             }
        } else {
             setError("No data found. Please import a file.");
        }
    } catch (err) {
        console.error("Error loading data from localStorage:", err);
        setError("Failed to load data. Please try importing again.");
    } finally {
        setLoading(false);
    }
  }, []); // Empty dependency array ensures this runs once on mount

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Data...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

   if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Error Loading Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
       <Card>
        <CardHeader>
          <CardTitle>No Customer Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No data has been imported yet. Please go to the <a href="/import" className="underline text-accent">Import Data</a> page to upload a file.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {data.headers.map((header, index) => (
                <TableHead key={index}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DataGrid;
