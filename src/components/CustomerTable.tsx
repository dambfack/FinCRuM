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
import { formatDateTime } from '@/lib/utils';

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
    <div className="overflow-x-auto rounded-lg border shadow-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id} className="hover:bg-muted/20">
              <TableCell className="font-medium">
                {contact.firstName} {contact.lastName}
              </TableCell>
              <TableCell>{contact.email}</TableCell>
              <TableCell>{contact.phone || '-'}</TableCell>
              <TableCell>{contact.company || '-'}</TableCell>
              <TableCell>
                {contact.status ? (
                  <Badge variant={getStatusBadgeVariant(contact.status)} className="capitalize">
                    {statusDisplayMap[contact.status] || contact.status}
                  </Badge>
                ) : '-'}
              </TableCell>
              <TableCell>{formatDateTime(contact.updatedAt as string)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onViewDetails(contact)} className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Details</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(contact)} className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(contact.id)} className="h-8 w-8 text-destructive hover:text-destructive">
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
