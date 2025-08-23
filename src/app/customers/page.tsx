
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { 
  PlusCircle, 
  Users, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomersPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [contactForNewActivity, setContactForNewActivity] = useState<Contact | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userRole, setUserRole] = useState<User['role']>('employee');
  const [customerStats, setCustomerStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0,
    conversionRate: 0
  });

  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Set user role based on current user
  useEffect(() => {
    if (currentUser?.role) {
      setUserRole(currentUser.role);
    }
  }, [currentUser]);

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

    const sortedContacts = [...visibleContacts]
      .filter(contact => contact.updatedAt) // Filter out contacts without updatedAt
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt as string).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt as string).getTime() : 0;
        return dateB - dateA;
      });

    setContacts(sortedContacts);

    // Calculate customer statistics
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const activeContacts = sortedContacts.filter(c => c.contactStatus === 'approved' || typeof c.contactStatus === 'undefined');
    const inactiveContacts = sortedContacts.filter(c => c.contactStatus === 'pending_approval' || c.contactStatus === 'pending_deletion');
    const newThisMonth = sortedContacts.filter(c => {
      const createdDate = new Date(c.createdAt || '');
      return createdDate >= thisMonth;
    });

    setCustomerStats({
      total: sortedContacts.length,
      active: activeContacts.length,
      inactive: inactiveContacts.length,
      newThisMonth: newThisMonth.length,
      conversionRate: sortedContacts.length > 0 ? Math.round((activeContacts.length / sortedContacts.length) * 100) : 0
    });

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

  // Filter contacts based on search term and status
  useEffect(() => {
    let filtered = contacts;
    
    if (searchTerm) {
      filtered = filtered.filter(contact => 
        contact.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone?.includes(searchTerm) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => {
        if (statusFilter === 'active') return contact.contactStatus === 'approved' || typeof contact.contactStatus === 'undefined';
        if (statusFilter === 'inactive') return contact.contactStatus === 'pending_approval' || contact.contactStatus === 'pending_deletion';
        return true;
      });
    }
    
    setFilteredContacts(filtered);
  }, [contacts, searchTerm, statusFilter]);

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };

  const handleDeleteRequest = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) {
        toast({ title: "Error", description: "Contact not found for deletion request.", variant: "destructive" });
        console.error("[CustomersPage] Contact not found in state for ID:", contactId);
        return;
    }
    if (!currentUser) {
        toast({ title: "Error", description: "User not authenticated. Cannot proceed with deletion request.", variant: "destructive" });
        console.error("[CustomersPage] Current user is null. Cannot proceed.");
        return;
    }
    setContactToDelete(contact);
    setIsDeleteConfirmOpen(true);
  };

  const handleExportData = () => {
    if (userRole === 'employee') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to export customer data.",
        variant: "destructive",
      });
      return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Email,Phone,Company,Status,Created Date\n" +
      filteredContacts.map(contact => 
        `"${contact.firstName || ''} ${contact.lastName || ''}","${contact.email || ''}","${contact.phone || ''}","${contact.company || ''}","${contact.contactStatus || 'approved'}","${contact.createdAt || ''}"`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `Exported ${filteredContacts.length} customers to CSV.`,
    });
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
    let currentContacts = getData<Contact[]>(DataItemType.Contacts) || [];
    const contactIndex = currentContacts.findIndex(c => c.id === contactId);

    if (currentUser.role === 'employee') {
      if (contactToDelete.contactStatus === 'pending_deletion') {
          toast({title: "Action Not Allowed", description: "This contact is already pending deletion.", variant: "default"});
      } else {
        const updatedContact: Contact = {
          ...contactToDelete,
          contactStatus: 'pending_deletion',
          lastModifiedByRole: 'employee',
          updatedAt: new Date().toISOString(),
        };
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
      }
    } else { // Partner is acting
      if (contactToDelete.contactStatus === 'pending_deletion') {
          // Partner is cancelling a pending deletion
          if (contactIndex > -1) {
              currentContacts[contactIndex] = {
                  ...contactToDelete,
                  contactStatus: 'approved', // Revert to approved
                  updatedAt: new Date().toISOString(),
                  lastModifiedByRole: 'partner',
                  changeProposal: undefined // Clear any pending change proposals if deletion is cancelled
              };
              saveData<Contact[]>(DataItemType.Contacts, currentContacts);
              toast({
                  title: 'Deletion Cancelled',
                  description: `Deletion request for ${contactToDelete.firstName} ${contactToDelete.lastName} has been cancelled.`,
              });
          } else {
            toast({ title: "Error", description: "Contact to cancel deletion for not found.", variant: "destructive" });
          }
      } else {
          // Partner is performing a direct deletion
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
          <h1 className="text-3xl font-bold font-heading flex items-center"> {/* Removed tracking-wide */}
            <Users className="mr-3 h-8 w-8 text-accent" /> All Customers
          </h1>
          <Skeleton className="h-11 w-48 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
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
        <div>
          <h1 className="text-3xl font-bold font-heading flex items-center"> {/* Removed tracking-wide */}
            <Users className="mr-3 h-8 w-8 text-accent" /> All Customers
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={userRole === 'admin' ? 'default' : userRole === 'partner' ? 'secondary' : 'outline'}>
              <Shield className="mr-1 h-3 w-3" />
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
            {userRole === 'employee' && (
              <Badge variant="outline" className="text-amber-600">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Limited Access
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {(userRole === 'admin' || userRole === 'partner') && (
            <Button variant="outline" onClick={handleExportData}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          <Link href="/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </Link>
          <Button asChild className="h-11 px-4 py-3">
            <Link href="/add-customer">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Customer
            </Link>
          </Button>
        </div>
      </div>

      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{customerStats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{customerStats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{customerStats.newThisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{customerStats.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find and filter customers based on various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Pending Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(searchTerm || statusFilter !== 'all') && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary">
                Showing {filteredContacts.length} of {contacts.length} customers
              </Badge>
              {searchTerm && (
                <Badge variant="outline">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="outline">
                  Status: {statusFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerTable
        contacts={filteredContacts}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
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
            <DialogTitle className="font-heading">Edit Customer</DialogTitle> {/* Removed tracking-wide */}
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
                  <DialogTitle className="font-heading">Add New Appointment</DialogTitle> {/* Removed tracking-wide */}
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
                    <DialogTitle className="font-heading">Add New Reminder</DialogTitle> {/* Removed tracking-wide */}
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
            <AlertDialogTitle className="font-heading">Confirm Action</AlertDialogTitle> {/* Removed tracking-wide */}
            <AlertDialogDescription>
              {contactToDelete && currentUser?.role === 'partner' && contactToDelete.contactStatus === 'pending_deletion'
                ? `Do you want to cancel the pending deletion for ${contactToDelete?.firstName} ${contactToDelete?.lastName}? The contact will remain active.`
                : contactToDelete && currentUser?.role === 'partner'
                ? `Are you sure you want to permanently delete ${contactToDelete?.firstName} ${contactToDelete?.lastName}? This action cannot be undone.`
                : contactToDelete && currentUser?.role === 'employee'
                ? `Are you sure you want to request deletion for ${contactToDelete?.firstName} ${contactToDelete?.lastName}? This will be sent for partner approval.`
                : "Are you sure?"
              }
              {userRole === 'employee' && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                  <AlertTriangle className="inline mr-1 h-4 w-4" />
                  As an employee, deletion requests require partner approval.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteConfirmOpen(false); setContactToDelete(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className={
                contactToDelete && currentUser?.role === 'partner' && contactToDelete.contactStatus === 'pending_deletion'
                  ? "" // Standard action color for "Cancel Deletion Request"
                  : (currentUser?.role === 'employee' || (currentUser?.role === 'partner' && contactToDelete?.contactStatus !== 'pending_deletion'))
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" // Destructive for actual deletion or request
                  : "" // Default for other cases
              }
            >
              {contactToDelete && currentUser?.role === 'partner' && contactToDelete.contactStatus === 'pending_deletion'
                ? 'Cancel Deletion Request'
                : currentUser?.role === 'employee'
                ? 'Request Deletion'
                : 'Delete Contact'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
    

    
