'use client';

import React, { useState, useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Download, 
  CheckCircle, 
  Info,
  Users,
  Database
} from 'lucide-react';
// import type { UserRole } from '@/lib/types';
import Link from 'next/link';

export default function ImportPage() {
  const [userRole, setUserRole] = useState<string>('employee');
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser?.role) {
      setUserRole(currentUser.role);
    }
  }, [currentUser]);

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "First Name,Last Name,Email,Phone,Company,Address,City,State,ZIP,Country,Notes\n" +
      "John,Doe,john.doe@example.com,+1-555-0123,Acme Corp,123 Main St,Anytown,CA,12345,USA,Sample customer data\n" +
      "Jane,Smith,jane.smith@example.com,+1-555-0456,Tech Solutions,456 Oak Ave,Springfield,NY,67890,USA,Another sample entry";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customer_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template Downloaded",
      description: "Customer import template has been downloaded.",
    });
  };

  if (userRole === 'employee') {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-heading flex items-center justify-center gap-2">
              <Upload className="h-8 w-8" />
              Import Data
            </h1>
            <p className="text-muted-foreground mt-2">
              Upload customer data from Excel or CSV files
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge variant="outline" className="text-amber-600">
                <Shield className="mr-1 h-3 w-3" />
                Employee Access
              </Badge>
            </div>
          </div>

          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Access Restricted:</strong> As an employee, you don't have permission to import customer data. 
              Please contact a partner or admin to perform data imports.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Import Information
              </CardTitle>
              <CardDescription>
                Learn about the import process and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Supported File Formats:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>CSV files (.csv)</li>
                  <li>Excel files (.xlsx, .xls)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Required Columns:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>First Name (required)</li>
                  <li>Last Name (required)</li>
                  <li>Email (required)</li>
                  <li>Phone, Company, Address (optional)</li>
                </ul>
              </div>
              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Link href="/customers">
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                View Customers
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading flex items-center gap-2">
            <Upload className="h-8 w-8" />
            Import Customer Data
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload Excel (.xlsx, .xls) or CSV (.csv) files to import customer data into your CRM.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
              <Shield className="mr-1 h-3 w-3" />
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Access
            </Badge>
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="mr-1 h-3 w-3" />
              Import Enabled
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Upload File
                </CardTitle>
                <CardDescription>
                  Select and upload your customer data file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Template & Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Supported Formats:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>CSV files (.csv)</li>
                    <li>Excel files (.xlsx, .xls)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Required Fields:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>First Name</li>
                    <li>Last Name</li>
                    <li>Email Address</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Optional Fields:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Phone Number</li>
                    <li>Company</li>
                    <li>Address, City, State, ZIP</li>
                    <li>Notes</li>
                  </ul>
                </div>
                <Button onClick={downloadTemplate} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Import Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Ensure email addresses are unique</p>
                <p>• Use consistent date formats</p>
                <p>• Remove empty rows before upload</p>
                <p>• Maximum file size: 10MB</p>
                <p>• Maximum records: 10,000 per file</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Data Privacy:</strong> All imported data is encrypted and stored securely. 
              Duplicate entries will be automatically detected and handled according to your merge preferences.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
