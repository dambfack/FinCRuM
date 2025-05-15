
// src/components/CustomerDetailModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { Contact, User } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDateTime, cn, saveData, getData, getFirstInitial } from '@/lib/utils';
import { User as UserIcon, Mail, Phone, Building, FileText as NotesIcon, Tag, CalendarDays, Edit, CalendarPlus, BellPlus, ListPlus, EllipsisVertical, Paperclip, Briefcase, Image as ImageIcon } from 'lucide-react';
import { DataItemType } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileAttachmentManager from './FileAttachmentManager';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfilePictureModal from './ProfilePictureModal'; // Import ProfilePictureModal
import { Card, CardContent } from '@/components/ui/card'; // Import Card and CardContent

interface CustomerDetailModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onEditRequest?: (contact: Contact) => void;
  onAddAppointmentRequest?: (contact: Contact) => void;
  onAddReminderRequest?: (contact: Contact) => void;
  onAddTaskRequest?: (contact: Contact) => void;
  onContactUpdate?: (updatedContact: Contact) => void;
}

const DetailItem: React.FC<{ icon: React.ElementType; label: string; value?: string | null | Date | React.ReactNode; className?: string }> = ({ icon: Icon, label, value, className }) => {
  if (!value && typeof value !== 'number' && typeof value !== 'boolean') return null;

  let isTruncateRequested = className?.includes('truncate');
  let outerDivClassName = className || "";
  let pTagClasses = "text-sm text-foreground";
  // The div that is flex-1 needs overflow-hidden to allow its child (the <p>) to truncate
  let valueContainerClasses = "min-w-0 flex-1 overflow-hidden"; 

  if (isTruncateRequested) {
    outerDivClassName = outerDivClassName.replace('truncate', '').trim();
    // Apply truncation directly to the <p> tag for better control
    pTagClasses = cn(pTagClasses, "overflow-hidden text-ellipsis whitespace-nowrap max-w-full");
  }


  let valueNode: React.ReactNode;

  if (React.isValidElement(value)) {
    valueNode = value;
  } else if (value instanceof Date) {
    const dateString = formatDateTime(value as string);
    valueNode = (
      <p className={pTagClasses} title={isTruncateRequested ? dateString : undefined}>
        {dateString}
      </p>
    );
  } else if (value !== null && value !== undefined) {
    const valueString = String(value);
    valueNode = (
      <p className={pTagClasses} title={isTruncateRequested ? valueString : undefined}>
        {valueString}
      </p>
    );
  } else {
    return null;
  }

  return (
    <div className={cn("flex items-start space-x-3 py-2", outerDivClassName)}>
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className={valueContainerClasses}>
        <p className="text-xs text-muted-foreground">{label}</p>
        {valueNode}
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
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isContactAvatarModalOpen, setIsContactAvatarModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadedUsers = getData<User[]>(DataItemType.Users) || [];
      setAllUsers(loadedUsers);
    }
  }, [isOpen]);

  const getUserName = (userId?: string): string => {
    if (!userId) return 'N/A';
    const user = allUsers.find(u => u.id === userId);
    return user ? `${user.name} (${user.role})` : 'Unknown User';
  };

  if (!contact) return null;

  const dialogContentClassName = "sm:max-w-2xl glass-effect bg-card/80 dark:bg-card/70 rounded-lg overflow-hidden p-4";

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
    const contacts = getData<Contact[]>(DataItemType.Contacts) || [];
    const contactIndex = contacts.findIndex(c => c.id === updatedContactWithNewAttachments.id);
    if (contactIndex > -1) {
      contacts[contactIndex] = updatedContactWithNewAttachments;
      saveData<Contact[]>(DataItemType.Contacts, contacts);
      if (onContactUpdate) {
        onContactUpdate(updatedContactWithNewAttachments);
      }
    }
  };

  const assignedUserDisplay = contact.assignedToUserId ? (
    <Badge variant="secondary" className="text-xs">
      <Briefcase className="h-3 w-3 mr-1.5" />
      {getUserName(contact.assignedToUserId)}
    </Badge>
  ) : 'N/A';

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={dialogContentClassName}>
        <DialogHeader className="pt-4 mb-4 flex flex-col items-center space-y-3">
          <button
            onClick={() => {
              if (contact.profilePictureUrl) {
                setIsContactAvatarModalOpen(true);
              }
            }}
            className={cn("rounded-full", contact.profilePictureUrl && "cursor-pointer hover:opacity-80 transition-opacity")}
            aria-label="View profile picture"
          >
            <Avatar className="h-28 w-28">
              <AvatarImage src={contact.profilePictureUrl} alt={`${contact.firstName} ${contact.lastName}`} />
              <AvatarFallback className="text-4xl">{getFirstInitial(contact.firstName)}</AvatarFallback>
            </Avatar>
          </button>
          <div className="text-center min-w-0 flex-1">
            <DialogTitle className="text-2xl font-heading truncate">
              {contact.firstName} {contact.lastName}
            </DialogTitle>
            <DialogDescription>Detailed information and attachments for this customer.</DialogDescription>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="attachments" className="w-full">
              <Paperclip className="mr-2 h-4 w-4" /> Attachments ({contact.attachments?.length || 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="pt-4 h-[55vh] overflow-y-auto pr-2 w-full overflow-hidden">
            <Card className="w-full bg-card/60 dark:bg-card/50 backdrop-blur-md">
              <CardContent className="space-y-1 p-4">
                <DetailItem icon={Mail} label="Email" value={contact.email} />
                {contact.phone && <DetailItem icon={Phone} label="Phone" value={contact.phone} />}
                {contact.company && <DetailItem icon={Building} label="Company" value={contact.company} />}
                {contact.address && <DetailItem icon={NotesIcon} label="Address" value={contact.address} />}
                {contact.status && <DetailItem icon={Tag} label="Deal Status" value={statusDisplay[contact.status] || contact.status} />}
                {contact.assignedToUserId && <DetailItem icon={Briefcase} label="Assigned To" value={assignedUserDisplay} />}
                {contact.notes && <DetailItem icon={NotesIcon} label="Notes" value={contact.notes} className="whitespace-pre-wrap" />}
                <DetailItem icon={CalendarDays} label="Created At" value={contact.createdAt ? formatDateTime(contact.createdAt as string) : 'N/A'} />
                <DetailItem icon={CalendarDays} label="Last Updated" value={contact.updatedAt ? formatDateTime(contact.updatedAt as string) : 'N/A'} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="attachments" className="pt-4 h-[55vh] overflow-y-auto pr-2 w-full overflow-hidden">
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
    {isContactAvatarModalOpen && (
      <ProfilePictureModal
        isOpen={isContactAvatarModalOpen}
        onClose={() => setIsContactAvatarModalOpen(false)}
        imageUrl={contact?.profilePictureUrl}
        altText={`${contact?.firstName} ${contact?.lastName}`}
      />
    )}
    </>
  );
};

export default CustomerDetailModal;
    
