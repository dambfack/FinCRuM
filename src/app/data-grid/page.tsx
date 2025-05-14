'use client';

import DataGrid from '@/components/DataGrid';
import { useState } from 'react';
import { Contact } from '@/lib/types';

export default function DataGridPage() {
  const [contacts, setContacts] = useState<Contact[]>([
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
  ]);

  const columns = ['firstName', 'lastName', 'email', 'phone'];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-heading tracking-wide">Contact Data</h1>
      <DataGrid data={contacts} columns={columns} />
    </div>
  );
}
