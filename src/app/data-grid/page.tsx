'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DataGrid from '@/components/DataGrid';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Contact } from '@/lib/types';
import { useLocalDatabase } from '@/hooks/use-local-database'; // Assuming this hook exists and provides contacts

// Sample data type for the data grid - can be refined based on actual Contact structure
type ContactData = Pick<Contact, 'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'createdAt' | 'updatedAt'>;

const columns: (keyof ContactData)[] = ['firstName', 'lastName', 'email', 'phone', 'createdAt', 'updatedAt'];

export default function DataGridPage() {
  const { getAllContacts } = useLocalDatabase(); // Assuming getAllContacts is available
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const allContacts = await getAllContacts();
        // Ensure all required fields for ContactData are present
        const formattedContacts = allContacts.map(contact => ({
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          createdAt: contact.createdAt ? new Date(contact.createdAt).toISOString() : '',
          updatedAt: contact.updatedAt ? new Date(contact.updatedAt).toISOString() : '',
        }));
        setContacts(formattedContacts);
        setError(null);
      } catch (err) {
        console.error('Error fetching contacts for DataGrid:', err);
        setError('Failed to load contact data.');
        setContacts([]); // Clear contacts on error
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [getAllContacts]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Contact Data</h1>
        <p>Loading contact data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Contact Data</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contact Data</h1>
        <Link href="/import" passHref>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Data
          </Button>
        </Link>
      </div>
      <div className="rounded-lg border">
        <DataGrid<ContactData> 
          data={contacts} 
          columns={columns} 
        />
      </div>
    </div>
  );
}
