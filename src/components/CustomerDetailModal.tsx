
// src/components/CustomerDetailModal.tsx
'use client';

import React from 'react';
import type { Contact } from '@/lib/types'; // Added FileAttachmentMeta
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDateTime, cn, saveData, getData } from '@/lib/utils';
import { User, Mail, Phone, Building, FileText as NotesIcon, Tag, CalendarDays, Edit, CalendarPlus, BellPlus, ListPlus, EllipsisVertical, Paperclip } from 'lucide-react';
import { DataItemType } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // For tabs
import FileAttachmentManager from './FileAttachmentManager'; // Import the new component

interface CustomerDetailModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onEditRequest?: (contact: Contact) => void;
  onAddAppointmentRequest?: (contact: Contact) => void;
  onAddReminderRequest?: (contact: Contact) => void;
  onAddTaskRequest?: (contact: Contact) => void;
  onContactUpdate?: (updatedContact: Contact) => void; // Changed signature
}

const DetailItem: React.FC<{ icon: React.ElementType; label: string; value?: string | null | Date; className?: string }> = ({ icon: Icon, label, value, className }) => {
  if (!value && typeof value !== 'number') return null; // Allow 0 to be displayed
  const displayValue = value instanceof Date ? formatDateTime(value as string) : String(value);
  return (
    <div className={cn("flex items-start space-x-3 py-2", className)}>
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{displayValue}</p>
      </div>
    </div>
  );
};

const statusDisplay: Record<Exclude<Contact['status'], undefined>, string> = {
    open: "Open (Deal in Progress)",
    closed: "Closed (Deal Won)",
    missed: "Missed (Deal Lost)",
    other: "Other"
};

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
    contact,
    isOpen,
    onClose,
    onEditRequest,
    onAddAppointmentRequest,
    onAddReminderRequest,
    onAddTaskRequest,
    onContactUpdate
}) => {
  if (!contact) return null;

  const dialogContentClassName = "sm:max-w-2xl glass-effect bg-card/80 dark:bg-card/70"; // Wider for tabs

  const handleEditClick = () => {
    if (contact && onEditRequest) {
      onEditRequest(contact);
    }
  };

  const handleAddAppointmentClick = () => {
    if (contact && onAddAppointmentRequest) {
        onAddAppointmentRequest(contact);
    }
  };

  const handleAddReminderClick = () => {
    if (contact && onAddReminderRequest) {
        onAddReminderRequest(contact);
    }
  };

  const handleAddTaskClick = () => {
    if (contact && onAddTaskRequest) {
        onAddTaskRequest(contact);
    }
  };

  const handleAttachmentsUpdate = (updatedContactWithNewAttachments: Contact) => {
    // Save the updated contact to localStorage
    const contacts = getData<Contact[]>(DataItemType.Contacts) || [];
    const contactIndex = contacts.findIndex(c => c.id === updatedContactWithNewAttachments.id);
    if (contactIndex > -1) {
      contacts[contactIndex] = updatedContactWithNewAttachments;
      saveData<Contact[]>(DataItemType.Contacts, contacts);
      if (onContactUpdate) {
        onContactUpdate(updatedContactWithNewAttachments); // Notify parent with the updated contact
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={dialogContentClassName}>
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-heading tracking-wide flex items-center">
            <User className="mr-3 h-6 w-6 text-accent" />
            {contact.firstName} {contact.lastName}
          </DialogTitle>
          <DialogDescription>Detailed information and attachments for this customer.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="attachments">
              <Paperclip className="mr-2 h-4 w-4" /> Attachments ({contact.attachments?.length || 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-1 max-h-[55vh] overflow-y-auto pr-2">
            <DetailItem icon={Mail} label="Email" value={contact.email} />
            {contact.phone && <DetailItem icon={Phone} label="Phone" value={contact.phone} />}
            {contact.company && <DetailItem icon={Building} label="Company" value={contact.company} />}
            {contact.address && <DetailItem icon={NotesIcon} label="Address" value={contact.address} />}
            {contact.status && <DetailItem icon={Tag} label="Deal Status" value={statusDisplay[contact.status] || contact.status} />}
            {contact.notes && <DetailItem icon={NotesIcon} label="Notes" value={contact.notes} className="whitespace-pre-wrap" />}
            <DetailItem icon={CalendarDays} label="Created At" value={contact.createdAt ? formatDateTime(contact.createdAt as string) : 'N/A'} />
            <DetailItem icon={CalendarDays} label="Last Updated" value={contact.updatedAt ? formatDateTime(contact.updatedAt as string) : 'N/A'} />
          </TabsContent>
          <TabsContent value="attachments" className="max-h-[55vh] overflow-y-auto pr-2">
            {/* Ensure contact prop is passed, and it's non-null */}
            <FileAttachmentManager contact={contact} onAttachmentsUpdate={handleAttachmentsUpdate} />
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex flex-wrap justify-end gap-2 pt-4 border-t border-border/20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 px-4 py-3">
                <EllipsisVertical className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-effect bg-popover/80 dark:bg-popover/60 border-white/10 dark:border-white/5">
              {onAddTaskRequest && (
                <DropdownMenuItem onClick={handleAddTaskClick} className="gap-2">
                  <ListPlus className="h-4 w-4" /> Add Task
                </DropdownMenuItem>
              )}
              {onAddAppointmentRequest && (
                <DropdownMenuItem onClick={handleAddAppointmentClick} className="gap-2">
                  <CalendarPlus className="h-4 w-4" /> Add Appointment
                </DropdownMenuItem>
              )}
              {onAddReminderRequest && (
                <DropdownMenuItem onClick={handleAddReminderClick} className="gap-2">
                  <BellPlus className="h-4 w-4" /> Add Reminder
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {onEditRequest && (
            <Button type="button" variant="default" onClick={handleEditClick} className="h-11 px-4 py-3">
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          )}
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-4 py-3">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailModal;
