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
    setLocalData(data || []); // Ensure localData is always an array
    // Error and loading states are primarily managed by the parent component (DataGridPage)
    // This component will just reflect the data passed to it.
    // If data is empty, the conditional rendering below will handle the "No Data Available" message.
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

  // Error state is now handled by the generic error block above
  // If localData is empty and there's no error, it means loading is done and data is legitimately empty.
  // The specific message for empty data (after successful load) can be shown here if needed,
  // or rely on the error message set in useEffect if data prop was empty.
  if (!loading && !error && (!localData || localData.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There is no data to display. You can import data or add new customers.</p>
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
