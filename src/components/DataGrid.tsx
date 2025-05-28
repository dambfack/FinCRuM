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

interface DataGridProps<T extends Record<string, unknown>> {
  data: T[];
  columns: string[];
}

const DataGrid = <T extends Record<string, unknown>>({ 
  data = [], 
  columns = [] 
}: DataGridProps<T>) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [localData, setLocalData] = useState<T[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (data && data.length > 0) {
          setLocalData(data);
        } else {
          // Fallback to localStorage if no data prop is provided
          const storedData = localStorage.getItem('customerData');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (Array.isArray(parsedData)) {
              setLocalData(parsedData as T[]);
            } else if (parsedData && Array.isArray(parsedData.rows)) {
              setLocalData(parsedData.rows as T[]);
            } else {
              setError("No valid data found. Please import a file.");
            }
          } else {
            setError("No data found. Please import a file.");
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data. Please try importing again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Data...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Error Loading Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!localData || localData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please import data to get started.</p>
        </CardContent>
      </Card>
    );
  }

  // Get all unique column names from the data
  const allColumns = columns && columns.length > 0 
    ? columns 
    : Array.from(
        new Set(
          localData.flatMap(item => Object.keys(item as Record<string, unknown>))
        )
      );

  return (
    <Card>
      <div className="overflow-auto max-h-[calc(100vh-200px)]">
        <Table>
          <TableHeader>
            <TableRow>
              {allColumns.map((column, index) => (
                <TableHead key={index} className="font-bold">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {localData.map((row, rowIndex) => {
              const rowData = row as Record<string, unknown>;
              return (
                <TableRow key={rowIndex}>
                  {allColumns.map((column, cellIndex) => (
                    <TableCell key={`${rowIndex}-${cellIndex}`}>
                      {String(rowData[column] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default DataGrid;
