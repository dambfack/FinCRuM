'use client';

import DataGrid from '@/components/DataGrid';
import { Contact } from '@/lib/types';

// Sample data type for the data grid
type ContactData = Pick<Contact, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'> & {
  createdAt: string;
  updatedAt: string;
};

const sampleContacts: ContactData[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '987-654-3210',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@example.com',
    phone: '555-123-4567',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const columns: (keyof ContactData)[] = ['firstName', 'lastName', 'email', 'phone'];

export default function DataGridPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Contact Data</h1>
      <div className="rounded-lg border">
        <DataGrid<ContactData> 
          data={sampleContacts} 
          columns={columns} 
        />
      </div>
    </div>
  );
}
