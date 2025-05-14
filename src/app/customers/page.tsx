
// src/app/customers/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Contact, User } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, deleteItemById, saveData, createNotification } from '@/lib/utils';
import CustomerTable from '@/components/CustomerTable';
import CustomerForm from '@/components/CustomerForm';
import CustomerDetailModal from '@/components/CustomerDetailModal';
import AppointmentForm from '@/components/AppointmentForm';
import ReminderForm from '@/components/ReminderForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomersPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [contactForNewActivity, setContactForNewActivity] = useState<Contact | null>(null);

  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const loadContacts = useCallback(() => {
    setLoading(true);
    const storedContacts = getData<Contact[]>(DataItemType.Contacts) || [];

    let visibleContacts = storedContacts;
    if (currentUser?.role === 'employee') {
      visibleContacts = storedContacts.filter(c => {
        const isExplicitlyApproved = c.contactStatus === 'approved';
        const isLegacyApproved = typeof c.contactStatus === 'undefined'; // Treat undefined as approved
        const isOwnPendingChange =
          (c.contactStatus === 'pending_approval' || c.contactStatus === 'pending_deletion') &&
          c.lastModifiedByRole === 'employee';
        return isExplicitlyApproved || isLegacyApproved || isOwnPendingChange;
      });
    }
    // For partners, all contacts are visible, including pending ones. CustomerTable can highlight them.

    setContacts([...visibleContacts].sort((a, b) => new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime()));
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadContacts();
    const loadedUsers = getData<User[]>(DataItemType.Users) || [];
    setAllUsers(loadedUsers);

    const handleDataChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === DataItemType.Contacts) {
        loadContacts();
      }
      if (customEvent.detail?.type === DataItemType.Users) {
        const reloadedUsers = getData<User[]>(DataItemType.Users) || [];
        setAllUsers(reloadedUsers);
      }
    };
    window.addEventListener('dataChanged', handleDataChange);
    return () => window.removeEventListener('dataChanged', handleDataChange);

  }, [loadContacts]);


  const handleEdit = (contact: Contact) => {
    // For employees, if the contact is pending deletion, they shouldn't edit.
    // Partners can edit anything.
    if (currentUser?.role === 'employee' && contact.contactStatus === 'pending_deletion') {
        toast({
            title: "Action Not Allowed",
            description: "This contact is pending deletion and cannot be edited by employees.",
            variant: "destructive"
        });
        return;
    }
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };

  const handleDelete = (contactId: string) => {
    console.log('[CustomersPage] handleDelete called with contact ID:', contactId); // DEBUG LINE
    const contactToDelete = contacts.find(c => c.id === contactId);
    if (!contactToDelete || !currentUser) {
        console.error("Delete aborted: Contact not found or user not authenticated.", { contactId, contactToDeleteExists: !!contactToDelete, currentUserExists: !!currentUser });
        toast({ title: "Error", description: "Could not proceed with delete. Contact not found or user not authenticated.", variant: "destructive"});
        return;
    }

    // Fetch the latest list of users directly from localStorage to ensure we have up-to-date partner information
    const currentAllUsers = getData<User[]>(DataItemType.Users) || [];

    if (confirm(`Are you sure you want to ${contactToDelete.contactStatus === 'pending_deletion' && currentUser.role === 'partner' ? 'cancel deletion for' : 'delete'} ${contactToDelete.firstName} ${contactToDelete.lastName}?`)) {
      if (currentUser.role === 'employee') {
        if (contactToDelete.contactStatus === 'pending_deletion') {
            toast({title: "Action Not Allowed", description: "This contact is already pending deletion.", variant: "default"});
            return;
        }
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
            saveData<Contact[]>(DataItemType.Contacts, currentContacts); // saveData will dispatch dataChanged
        }

        const partners = currentAllUsers.filter(u => u.role === 'partner');
        if (partners.length > 0) {
            partners.forEach(partner => {
                createNotification({
                    recipientUserId: partner.id,
                    type: 'approval_request',
                    title: `Contact Deletion Request: ${contactToDelete.firstName} ${contactToDelete.lastName}`,
                    message: `Employee ${currentUser.name} has requested to delete contact: ${contactToDelete.firstName} ${contactToDelete.lastName}.`,
                    relatedItemId: contactId,
                    relatedItemType: DataItemType.Contacts,
                    payload: { contactId: contactToDelete.id, contactName: `${contactToDelete.firstName} ${contactToDelete.lastName}` }
                });
            });
            toast({
                title: 'Deletion Requested',
                description: `${contactToDelete.firstName} ${contactToDelete.lastName} has been marked for deletion pending partner approval.`,
            });
        } else {
            toast({
                title: 'Deletion Requested (No Partners Notified)',
                description: `${contactToDelete.firstName} ${contactToDelete.lastName} marked for deletion. No partners found to notify.`,
                variant: 'default'
            });
        }
      } else { // Partner is acting
        if (contactToDelete.contactStatus === 'pending_deletion') {
            // Partner is cancelling a pending deletion
            const currentContacts = getData<Contact[]>(DataItemType.Contacts) || [];
            const contactIndex = currentContacts.findIndex(c => c.id === contactId);
            if (contactIndex > -1) {
                currentContacts[contactIndex] = {
                    ...contactToDelete,
                    contactStatus: 'approved', // Revert to approved
                    updatedAt: new Date().toISOString(),
                    lastModifiedByRole: 'partner',
                    changeProposal: undefined // Clear any pending proposal
                };
                saveData<Contact[]>(DataItemType.Contacts, currentContacts);
                toast({
                    title: 'Deletion Cancelled',
                    description: `Deletion request for ${contactToDelete.firstName} ${contactToDelete.lastName} has been cancelled.`,
                });
            }
        } else {
            // Partner is deleting directly
            deleteItemById<Contact>(DataItemType.Contacts, contactId); // deleteItemById also uses saveData, so it will dispatch dataChanged
            toast({
                title: 'Customer Deleted',
                description: `${contactToDelete.firstName} ${contactToDelete.lastName} has been removed.`,
            });
        }
      }
      // loadContacts(); // This will be handled by the dataChanged event listener
    }
  };

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  };

  const handleSaveCustomer = () => {
    setIsEditModalOpen(false);
    setSelectedContact(null);
    // loadContacts(); // Handled by dataChanged event
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
        prevContacts.map(c => c.id === updatedContact.id ? updatedContact : c)
    );
    if (selectedContact && selectedContact.id === updatedContact.id) {
      setSelectedContact(updatedContact); 
    }
    // The 'dataChanged' event dispatched by saveData will trigger loadContacts for full refresh if needed elsewhere
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

