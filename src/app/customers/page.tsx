// src/app/customers/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Contact } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData, deleteItemById } from '@/lib/utils';
import CustomerTable from '@/components/CustomerTable';
import CustomerForm from '@/components/CustomerForm';
import CustomerDetailModal from '@/components/CustomerDetailModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomersPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  const loadContacts = useCallback(() => {
    setLoading(true);
    const storedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
    setContacts(storedContacts.sort((a, b) => new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };

  const handleDelete = (contactId: string) => {
    // Consider adding a confirmation dialog here
    const contactToDelete = contacts.find(c => c.id === contactId);
    if (confirm(`Are you sure you want to delete ${contactToDelete?.firstName} ${contactToDelete?.lastName}?`)) {
        deleteItemById<Contact>(DataItemType.Contacts, contactId);
        toast({
            title: 'Customer Deleted',
            description: `${contactToDelete?.firstName} ${contactToDelete?.lastName} has been removed.`,
        });
        loadContacts(); // Refresh the list
    }
  };

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  };

  const handleSaveCustomer = () => {
    setIsEditModalOpen(false);
    setSelectedContact(null);
    loadContacts(); // Refresh the list after saving
    // Toast is handled by CustomerForm
  };
  
  const dialogContentClassName = "sm:max-w-2xl glass-effect bg-card/80 dark:bg-card/70";


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold font-heading tracking-wide flex items-center">
            <Users className="mr-3 h-8 w-8 text-accent" /> All Customers
          </h1>
          <Skeleton className="h-11 w-48 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-heading tracking-wide flex items-center">
          <Users className="mr-3 h-8 w-8 text-accent" /> All Customers
        </h1>
        <Button asChild className="h-11 px-4 py-3">
          <Link href="/add-customer">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Customer
          </Link>
        </Button>
      </div>

      <CustomerTable contacts={contacts} onEdit={handleEdit} onDelete={handleDelete} onViewDetails={handleViewDetails} />

      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
          if (!open) {
            setSelectedContact(null); // Clear selected contact when closing
          }
          setIsEditModalOpen(open);
      }}>
        <DialogContent className={dialogContentClassName}>
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wide">Edit Customer</DialogTitle>
            <DialogDescription>Update the customer's details below.</DialogDescription>
          </DialogHeader>
          {selectedContact && ( // Ensure selectedContact is not null before rendering form
            <CustomerForm
              initialData={selectedContact}
              onSave={handleSaveCustomer}
            />
          )}
        </DialogContent>
      </Dialog>

      <CustomerDetailModal
        contact={selectedContact}
        isOpen={isDetailModalOpen}
        onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedContact(null); // Important to clear after closing details too
        }}
      />
    </div>
  );
}
