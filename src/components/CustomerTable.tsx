
// src/components/CustomerTable.tsx
'use client';

import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import type { Contact, User } from '@/lib/types'; // Added User
import { DataItemType } from '@/lib/types'; // Added DataItemType
import { getData } from '@/lib/utils'; // Added getData
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
import { Edit, Trash2, Eye, MoreVertical, CalendarPlus, BellPlus, User as UserIcon } from 'lucide-react'; // Added UserIcon
import { formatDateTime, cn } from '@/lib/utils';

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

const CustomerTable: React.FC<CustomerTableProps> = ({ contacts, onEdit, onDelete, onViewDetails, onAddAppointment, onAddReminder }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);

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
            <TableHead className="text-foreground/80 dark:text-foreground/70">Email</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Phone</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Company</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Status</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Assigned To</TableHead> {/* New Column */}
            <TableHead className="text-foreground/80 dark:text-foreground/70">Last Updated</TableHead>
            <TableHead className="text-right w-[60px] text-foreground/80 dark:text-foreground/70">Actions</TableHead> 
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id} className="hover:bg-white/5 dark:hover:bg-white/5 border-b border-white/10 dark:border-white/5 last:border-b-0">
              <TableCell className="font-medium text-foreground">
                {contact.firstName} {contact.lastName}
              </TableCell>
              <TableCell className="text-foreground/90">{contact.email}</TableCell>
              <TableCell className="text-foreground/90">{contact.phone || '-'}</TableCell>
              <TableCell className="text-foreground/90">{contact.company || '-'}</TableCell>
              <TableCell>
                {contact.status ? (
                  <Badge variant={getStatusBadgeVariant(contact.status)} className={cn("capitalize", 
                    contact.status === 'open' && 'bg-sky-500/80 hover:bg-sky-500/70 text-white',
                    contact.status === 'closed' && 'bg-green-500/80 hover:bg-green-500/70 text-white',
                    contact.status === 'missed' && 'bg-red-500/80 hover:bg-red-500/70 text-white',
                    contact.status === 'other' && 'bg-slate-500/80 hover:bg-slate-500/70 text-white'
                  )}>
                    {statusDisplayMap[contact.status] || contact.status}
                  </Badge>
                ) : <span className="text-foreground/90">-</span>}
              </TableCell>
              <TableCell className="text-foreground/90"> {/* Assigned To Cell */}
                {contact.assignedToUserId ? (
                  <Badge variant="outline" className="flex items-center gap-1 max-w-[150px] truncate">
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
                    <DropdownMenuItem onClick={() => onEdit(contact)} className="gap-2">
                      <Edit className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => onAddAppointment(contact)} className="gap-2">
                      <CalendarPlus className="h-4 w-4" /> Add Appointment
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddReminder(contact)} className="gap-2">
                      <BellPlus className="h-4 w-4" /> Add Reminder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(contact.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2">
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerTable;
