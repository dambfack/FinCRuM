
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);


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
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };

  const handleDeleteRequest = (contactId: string) => {
    console.log('[CustomersPage] handleDeleteRequest called with contact ID:', contactId);
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setContactToDelete(contact);
      setIsDeleteConfirmOpen(true);
    } else {
      toast({ title: "Error", description: "Contact not found for deletion.", variant: "destructive" });
    }
  };

  const executeDelete = () => {
    if (!contactToDelete || !currentUser) {
      toast({ title: "Error", description: "Cannot execute delete. Contact or user data missing.", variant: "destructive" });
      setIsDeleteConfirmOpen(false);
      setContactToDelete(null);
      return;
    }

    const currentAllUsers = getData<User[]>(DataItemType.Users) || [];
    const contactId = contactToDelete.id;

    if (currentUser.role === 'employee') {
      if (contactToDelete.contactStatus === 'pending_deletion') {
          toast({title: "Action Not Allowed", description: "This contact is already pending deletion.", variant: "default"});
          setIsDeleteConfirmOpen(false);
          setContactToDelete(null);
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
          saveData<Contact[]>(DataItemType.Contacts, currentContacts);
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
          const currentContacts = getData<Contact[]>(DataItemType.Contacts) || [];
          const contactIndex = currentContacts.findIndex(c => c.id === contactId);
          if (contactIndex > -1) {
              currentContacts[contactIndex] = {
                  ...contactToDelete,
                  contactStatus: 'approved',
                  updatedAt: new Date().toISOString(),
                  lastModifiedByRole: 'partner',
                  changeProposal: undefined
              };
              saveData<Contact[]>(DataItemType.Contacts, currentContacts);
              toast({
                  title: 'Deletion Cancelled',
                  description: `Deletion request for ${contactToDelete.firstName} ${contactToDelete.lastName} has been cancelled.`,
              });
          }
      } else {
          deleteItemById<Contact>(DataItemType.Contacts, contactId);
          toast({
              title: 'Customer Deleted',
              description: `${contactToDelete.firstName} ${contactToDelete.lastName} has been removed.`,
          });
      }
    }
    setIsDeleteConfirmOpen(false);
    setContactToDelete(null);
    // loadContacts(); // dataChanged event will handle this
  };


  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  };

  const handleSaveCustomer = () => {
    setIsEditModalOpen(false);
    setSelectedContact(null);
    // loadContacts(); // Reload contacts after save, handled by dataChanged event now
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
        onDelete={handleDeleteRequest} // Changed to handleDeleteRequest
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
                  initialData={undefined}
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
                    initialReminder={undefined} 
                    initialSelectedContactId={contactForNewActivity?.id}
                    onSave={handleSaveReminder}
                    onCancel={() => { setIsReminderFormOpen(false); setContactForNewActivity(null);}}
                />
            </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent className="glass-effect bg-card/80 dark:bg-card/70">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading tracking-wide">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              {contactToDelete && currentUser?.role === 'partner' && contactToDelete.contactStatus === 'pending_deletion' ?
                `Are you sure you want to cancel the pending deletion for ${contactToDelete?.firstName} ${contactToDelete?.lastName}?` :
              contactToDelete && currentUser?.role === 'partner' ?
                `Are you sure you want to permanently delete ${contactToDelete?.firstName} ${contactToDelete?.lastName}? This action cannot be undone.` :
              contactToDelete && currentUser?.role === 'employee' ?
                `Are you sure you want to request deletion for ${contactToDelete?.firstName} ${contactToDelete?.lastName}? This will be sent for partner approval.` :
                "Are you sure?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteConfirmOpen(false); setContactToDelete(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className={
                contactToDelete && currentUser?.role === 'partner' && contactToDelete.contactStatus === 'pending_deletion'
                  ? "" // Standard action color for "Cancel Deletion"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90" // Destructive color for "Delete" or "Request Deletion"
              }
            >
              {contactToDelete && currentUser?.role === 'partner' && contactToDelete.contactStatus === 'pending_deletion'
                ? 'Cancel Deletion Request'
                : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
    

    