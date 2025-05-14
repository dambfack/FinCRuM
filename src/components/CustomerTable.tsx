
// src/components/CustomerTable.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { Contact, User } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, Eye, MoreVertical, CalendarPlus, BellPlus, User as UserIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDateTime, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  onViewDetails: (contact: Contact) => void;
  onAddAppointment: (contact: Contact) => void;
  onAddReminder: (contact: Contact) => void;
}

const statusDisplayMap: Record<Exclude<Contact['status'], undefined>, string> = {
    open: "Open",
    closed: "Closed",
    missed: "Missed",
    other: "Other"
};

const getStatusBadgeVariant = (status?: Contact['status']) => {
  switch (status) {
    case 'open': return 'default';
    case 'closed': return 'secondary';
    case 'missed': return 'destructive';
    default: return 'outline';
  }
};

const getContactStatusDisplay = (status?: Contact['contactStatus']): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline', Icon?: React.ElementType } => {
  switch (status) {
    case 'pending_approval':
      return { text: 'Pending Approval', variant: 'secondary', Icon: AlertCircle };
    case 'pending_deletion':
      return { text: 'Pending Deletion', variant: 'destructive', Icon: AlertCircle };
    case 'approved':
      return { text: 'Approved', variant: 'default', Icon: CheckCircle };
    default:
      // For undefined or legacy contacts, treat as 'Approved' but maybe with a less prominent style
      // Or, if you want to explicitly show 'N/A' or similar:
      return { text: status || 'Approved (Legacy)', variant: 'outline' };
  }
};


const CustomerTable: React.FC<CustomerTableProps> = ({ contacts, onEdit, onDelete, onViewDetails, onAddAppointment, onAddReminder }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { currentUser } = useAuth();

  console.log('[CustomerTable] currentUser:', currentUser); // DEBUG LINE to check AuthContext

  useEffect(() => {
    const loadedUsers = getData<User[]>(DataItemType.Users) || [];
    setAllUsers(loadedUsers);
  }, []);

  const getUserName = (userId?: string): string => {
    if (!userId) return '-';
    const user = allUsers.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  if (contacts.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No customers found. Add one to get started!</p>;
  }

  return (
    <div className={cn(
      "overflow-x-auto rounded-xl border shadow-xl",
      "bg-card/60 dark:bg-card/40 backdrop-blur-lg",
      "border-white/20 dark:border-white/10"
    )}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent dark:hover:bg-transparent border-b border-white/10 dark:border-white/5">
            <TableHead className="text-foreground/80 dark:text-foreground/70">Name</TableHead>
            {currentUser?.role === 'partner' && <TableHead className="text-foreground/80 dark:text-foreground/70">Record Status</TableHead>}
            <TableHead className="text-foreground/80 dark:text-foreground/70">Email</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Phone</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Company</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Deal Status</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Assigned To</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Last Updated</TableHead>
            <TableHead className="text-right w-[60px] text-foreground/80 dark:text-foreground/70">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const contactStatusInfo = getContactStatusDisplay(contact.contactStatus);
            return (
            <TableRow
              key={contact.id}
              className={cn(
                "hover:bg-white/5 dark:hover:bg-white/5 border-b border-white/10 dark:border-white/5 last:border-b-0",
                contact.contactStatus === 'pending_approval' && currentUser?.role === 'partner' && "bg-orange-500/10 dark:bg-orange-500/20",
                contact.contactStatus === 'pending_deletion' && currentUser?.role === 'partner' && "bg-red-500/10 dark:bg-red-500/20"
              )}
            >
              <TableCell
                className="font-medium text-foreground hover:text-accent hover:underline cursor-pointer"
                onClick={() => onViewDetails(contact)}
                title={`View details for ${contact.firstName} ${contact.lastName}`}
              >
                {contact.firstName} {contact.lastName}
              </TableCell>
              {currentUser?.role === 'partner' && (
                <TableCell>
                  <Badge variant={contactStatusInfo.variant} className={cn("capitalize text-xs",
                     contactStatusInfo.variant === 'default' && 'bg-green-500/80 hover:bg-green-500/70 text-white',
                     contactStatusInfo.variant === 'secondary' && 'bg-orange-500/80 hover:bg-orange-500/70 text-white',
                     contactStatusInfo.variant === 'destructive' && 'bg-red-600/80 hover:bg-red-600/70 text-white'
                  )}>
                    {contactStatusInfo.Icon && <contactStatusInfo.Icon className="mr-1 h-3 w-3" />}
                    {contactStatusInfo.text}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="text-foreground/90">{contact.email}</TableCell>
              <TableCell className="text-foreground/90">{contact.phone || '-'}</TableCell>
              <TableCell className="text-foreground/90">{contact.company || '-'}</TableCell>
              <TableCell>
                {contact.status ? (
                  <Badge variant={getStatusBadgeVariant(contact.status)} className={cn("capitalize text-xs",
                    contact.status === 'open' && 'bg-sky-500/80 hover:bg-sky-500/70 text-white',
                    contact.status === 'closed' && 'bg-green-500/80 hover:bg-green-500/70 text-white',
                    contact.status === 'missed' && 'bg-red-500/80 hover:bg-red-500/70 text-white',
                    contact.status === 'other' && 'bg-slate-500/80 hover:bg-slate-500/70 text-white'
                  )}>
                    {statusDisplayMap[contact.status] || contact.status}
                  </Badge>
                ) : <span className="text-foreground/90">-</span>}
              </TableCell>
              <TableCell className="text-foreground/90">
                {contact.assignedToUserId ? (
                  <Badge variant="outline" className="flex items-center gap-1 max-w-[150px] truncate text-xs">
                    <UserIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate" title={getUserName(contact.assignedToUserId)}>
                        {getUserName(contact.assignedToUserId)}
                    </span>
                  </Badge>
                ) : '-'}
              </TableCell>
              <TableCell className="text-foreground/90">{formatDateTime(contact.updatedAt as string)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/10">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-effect bg-popover/80 dark:bg-popover/60 border-white/10 dark:border-white/5">
                    <DropdownMenuItem onClick={() => onViewDetails(contact)} className="gap-2">
                      <Eye className="h-4 w-4" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(contact)} className="gap-2"
                      disabled={contact.contactStatus === 'pending_deletion' && currentUser?.role === 'employee'}
                    >
                      <Edit className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => onAddAppointment(contact)} className="gap-2">
                      <CalendarPlus className="h-4 w-4" /> Add Appointment
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddReminder(contact)} className="gap-2">
                      <BellPlus className="h-4 w-4" /> Add Reminder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => alert('Delete clicked for ' + contact.id)} // SIMPLIFIED FOR DEBUGGING
                      className={cn("gap-2", (contact.contactStatus === 'pending_deletion' && currentUser?.role === 'partner') ? "text-orange-500 focus:text-orange-600 focus:bg-orange-500/10" : "text-destructive focus:text-destructive focus:bg-destructive/10")}
                      disabled={contact.contactStatus === 'pending_deletion' && currentUser?.role === 'employee'}
                    >
                      <Trash2 className="h-4 w-4" />
                      {(contact.contactStatus === 'pending_deletion' && currentUser?.role === 'partner') ? 'Cancel Deletion' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerTable;
