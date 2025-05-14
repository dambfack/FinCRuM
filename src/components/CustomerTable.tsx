// src/components/CustomerTable.tsx
'use client';

import React from 'react';
import type { Contact } from '@/lib/types';
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
import { Edit, Trash2, Eye } from 'lucide-react';
import { formatDateTime, cn } from '@/lib/utils';

interface CustomerTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  onViewDetails: (contact: Contact) => void;
}

const statusDisplayMap: Record<Exclude<Contact['status'], undefined>, string> = {
    open: "Open",
    closed: "Closed",
    missed: "Missed",
    other: "Other"
};

const getStatusBadgeVariant = (status?: Contact['status']) => {
  switch (status) {
    case 'open': return 'default'; // Or a specific "info" variant if you add one
    case 'closed': return 'secondary'; // Green if you have success/secondary set to green
    case 'missed': return 'destructive';
    default: return 'outline';
  }
};

const CustomerTable: React.FC<CustomerTableProps> = ({ contacts, onEdit, onDelete, onViewDetails }) => {
  if (contacts.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No customers found. Add one to get started!</p>;
  }

  return (
    <div className={cn(
      "overflow-x-auto rounded-xl border shadow-xl", // Existing styles + increased rounding
      "bg-card/60 dark:bg-card/40 backdrop-blur-lg", // Translucent background with blur
      "border-white/20 dark:border-white/10" // Glass-like border
    )}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent dark:hover:bg-transparent border-b border-white/10 dark:border-white/5">
            <TableHead className="text-foreground/80 dark:text-foreground/70">Name</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Email</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Phone</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Company</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Status</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Last Updated</TableHead>
            <TableHead className="text-right w-[150px] text-foreground/80 dark:text-foreground/70">Actions</TableHead>
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
              <TableCell className="text-foreground/90">{formatDateTime(contact.updatedAt as string)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onViewDetails(contact)} className="h-8 w-8 text-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/10">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Details</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(contact)} className="h-8 w-8 text-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/10">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(contact.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerTable;
