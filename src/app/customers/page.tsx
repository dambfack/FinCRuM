
// src/app/customers/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Contact, Appointment, Reminder, User } from '@/lib/types'; // Added User
import { DataItemType } from '@/lib/types';
import { getData, deleteItemById, saveData, createNotification } from '@/lib/utils'; // Added createNotification, saveData
import CustomerTable from '@/components/CustomerTable';
import CustomerForm from '@/components/CustomerForm';
import CustomerDetailModal from '@/components/CustomerDetailModal';
import AppointmentForm from '@/components/AppointmentForm'; // Added
import ReminderForm from '@/components/ReminderForm'; // Added
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export default function CustomersPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // State for new Appointment/Reminder modals
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [contactForNewActivity, setContactForNewActivity] = useState<Contact | null>(null);
  
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get current user
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadedUsers = getData<User[]>(DataItemType.Users) || [];
    setAllUsers(loadedUsers);
  }, []);

  const loadContacts = useCallback(() => {
    setLoading(true);
    const storedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
    // Filter contacts for employees: only show 'approved' or their own 'pending_approval'/'pending_deletion'
    // Partners see all.
    const visibleContacts = currentUser?.role === 'employee' 
      ? storedContacts.filter(c => 
          c.contactStatus === 'approved' || 
          (c.lastModifiedByRole === 'employee' && c.id.startsWith(`contact-${currentUser.id}`)) // Simplistic check for "their own"
        )
      : storedContacts;

    setContacts(visibleContacts.sort((a, b) => new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime()));
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };

  const handleDelete = (contactId: string) => {
    const contactToDelete = contacts.find(c => c.id === contactId);
    if (!contactToDelete) return;

    if (confirm(`Are you sure you want to delete ${contactToDelete.firstName} ${contactToDelete.lastName}?`)) {
      if (currentUser?.role === 'employee') {
        const updatedContact: Contact = { 
          ...contactToDelete, 
          contactStatus: 'pending_deletion',
          lastModifiedByRole: 'employee',
          updatedAt: new Date().toISOString(),
        };
        const currentContacts = getData<Contact[]>(DataItemType.Contacts) || [];
        const contactIndex = currentContacts.findIndex(c => c.id === contactId);
        if (contactIndex > -1) {
            currentContacts[contactIndex] = updatedContact;
            saveData<Contact[]>(DataItemType.Contacts, currentContacts);
        }
        
        // Notify partners
        const partners = allUsers.filter(u => u.role === 'partner');
        partners.forEach(partner => {
            createNotification({
                recipientUserId: partner.id,
                type: 'approval_request',
                title: `Contact Deletion Request: ${contactToDelete.firstName} ${contactToDelete.lastName}`,
                message: `Employee ${currentUser.name} has requested to delete a contact.`,
                relatedItemId: contactId,
                relatedItemType: DataItemType.Contacts,
                payload: { contactToDelete }
            });
        });
        toast({
            title: 'Deletion Requested',
            description: `${contactToDelete.firstName} ${contactToDelete.lastName} has been marked for deletion pending partner approval.`,
        });
      } else { // Partner deletes directly
        deleteItemById<Contact>(DataItemType.Contacts, contactId);
        toast({
            title: 'Customer Deleted',
            description: `${contactToDelete.firstName} ${contactToDelete.lastName} has been removed.`,
        });
      }
      loadContacts(); 
    }
  };

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  };

  const handleSaveCustomer = () => {
    setIsEditModalOpen(false);
    setSelectedContact(null);
    loadContacts(); 
  };

  const handleEditRequestFromDetail = (contact: Contact) => {
    setIsDetailModalOpen(false); 
    handleEdit(contact);
  };

  const handleOpenAppointmentModal = (contact: Contact) => {
    setContactForNewActivity(contact);
    setIsAppointmentFormOpen(true);
    setIsDetailModalOpen(false); 
  };

  const handleOpenReminderModal = (contact: Contact) => {
    setContactForNewActivity(contact);
    setIsReminderFormOpen(true);
    setIsDetailModalOpen(false); 
  };
  
  const handleSaveAppointment = () => {
    setIsAppointmentFormOpen(false);
    setContactForNewActivity(null);
    toast({title: "Appointment Saved", description: "The new appointment has been added."});
  };

  const handleSaveReminder = () => {
    setIsReminderFormOpen(false);
    setContactForNewActivity(null);
    toast({title: "Reminder Saved", description: "The new reminder has been added."});
  };

  const handleContactUpdatedFromModal = (updatedContact: Contact) => {
    setContacts(prevContacts =>
      prevContacts.map(c => (c.id === updatedContact.id ? updatedContact : c))
                  .sort((a, b) => new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime())
    );
    if (selectedContact && selectedContact.id === updatedContact.id) {
      setSelectedContact(updatedContact);
    }
    loadContacts(); // Ensure full refresh for pending statuses etc.
  };
  
  const dialogContentClassName = "sm:max-w-2xl glass-effect bg-card/80 dark:bg-card/70";
  const activityDialogContentClassName = "sm:max-w-lg glass-effect bg-card/80 dark:bg-card/70";


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

      <CustomerTable 
        contacts={contacts} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        onViewDetails={handleViewDetails}
        onAddAppointment={handleOpenAppointmentModal}
        onAddReminder={handleOpenReminderModal}
      />

      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
          if (!open) {
            setSelectedContact(null); 
          }
          setIsEditModalOpen(open);
      }}>
        <DialogContent className={dialogContentClassName}>
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wide">Edit Customer</DialogTitle>
            <DialogDescription>Update the customer's details below.</DialogDescription>
          </DialogHeader>
          {selectedContact && ( 
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
            setSelectedContact(null); 
        }}
        onEditRequest={handleEditRequestFromDetail}
        onAddAppointmentRequest={(contact) => {
            setIsDetailModalOpen(false); 
            handleOpenAppointmentModal(contact);
        }}
        onAddReminderRequest={(contact) => {
            setIsDetailModalOpen(false); 
            handleOpenReminderModal(contact);
        }}
        onContactUpdate={handleContactUpdatedFromModal} 
      />

      {/* Appointment Form Dialog */}
      <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
          <DialogContent className={activityDialogContentClassName}>
              <DialogHeader>
                  <DialogTitle className="font-heading tracking-wide">Add New Appointment</DialogTitle>
                  {contactForNewActivity && <DialogDescription>For: {contactForNewActivity.firstName} {contactForNewActivity.lastName}</DialogDescription>}
              </DialogHeader>
              <AppointmentForm
                  initialSelectedContactId={contactForNewActivity?.id}
                  onSave={handleSaveAppointment}
                  onCancel={() => {setIsAppointmentFormOpen(false); setContactForNewActivity(null);}}
              />
          </DialogContent>
      </Dialog>

      {/* Reminder Form Dialog */}
      <Dialog open={isReminderFormOpen} onOpenChange={setIsReminderFormOpen}>
            <DialogContent className={activityDialogContentClassName}>
                <DialogHeader>
                    <DialogTitle className="font-heading tracking-wide">Add New Reminder</DialogTitle>
                    {contactForNewActivity && <DialogDescription>For: {contactForNewActivity.firstName} {contactForNewActivity.lastName}</DialogDescription>}
                </DialogHeader>
                <ReminderForm
                    initialSelectedContactId={contactForNewActivity?.id}
                    onSave={handleSaveReminder}
                    onCancel={() => { setIsReminderFormOpen(false); setContactForNewActivity(null);}}
                />
            </DialogContent>
      </Dialog>

    </div>
  );
}
