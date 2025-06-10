
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Contact, User, FileAttachmentMeta } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, getFirstInitial, formatDateTime } from '@/lib/utils';
import { getFile as getAttachmentFromDB } from '@/lib/indexeddb'; // Renamed to avoid conflict
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { DownloadCloud, AlertTriangle, FileArchive } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Papa from 'papaparse';
import JSZip from 'jszip';

export default function ExportDataPage() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Record<string, boolean>>({});
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadContacts = useCallback(() => {
    setLoadingContacts(true);
    const storedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
    setContacts(storedContacts
      .filter(contact => contact.updatedAt) // Filter out contacts without updatedAt
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt as string).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt as string).getTime() : 0;
        return dateB - dateA;
      })
    );
    setLoadingContacts(false);
  }, []);

  useEffect(() => {
    if (!isLoadingAuth && currentUser?.role !== 'partner') {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      router.push('/');
    } else if (!isLoadingAuth && currentUser?.role === 'partner') {
      loadContacts();
    }
  }, [currentUser, isLoadingAuth, router, toast, loadContacts]);

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts((prev) => ({
      ...prev,
      [contactId]: !prev[contactId],
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelectedContacts: Record<string, boolean> = {};
    if (checked) {
      contacts.forEach((contact) => {
        newSelectedContacts[contact.id] = true;
      });
    }
    setSelectedContacts(newSelectedContacts);
  };

  const numSelected = Object.values(selectedContacts).filter(Boolean).length;
  const isAllSelected = contacts.length > 0 && numSelected === contacts.length;

  const handleExport = async () => {
    setIsExporting(true);
    toast({
      title: 'Export Started',
      description: 'Preparing your data for export. This may take a moment...',
      duration: 10000, // Longer duration for export
    });

    const contactsToExport = contacts.filter((contact) => selectedContacts[contact.id]);

    if (contactsToExport.length === 0) {
      toast({
        title: 'No Contacts Selected',
        description: 'Please select at least one contact to export.',
        variant: 'default',
      });
      setIsExporting(false);
      return;
    }

    console.log('Selected contacts for export:', contactsToExport.map(c => c.id));

    try {
      const csvData = contactsToExport.map(contact => ({
        ID: contact.id,
        FirstName: contact.firstName,
        LastName: contact.lastName,
        Email: contact.email,
        Phone: contact.phone || '',
        Company: contact.company || '',
        Address: contact.address || '',
        Notes: contact.notes || '',
        DealStatus: contact.status || '',
        AssignedToUserID: contact.assignedToUserId || '',
        CreatedAt: contact.createdAt ? formatDateTime(contact.createdAt as string) : '', // Format dates
        UpdatedAt: contact.updatedAt ? formatDateTime(contact.updatedAt as string) : '', // Format dates
        // ProfilePictureURL: contact.profilePictureUrl || '', // Excluded as per request
        ContactRecordStatus: contact.contactStatus || 'approved',
      }));

      const csvString = Papa.unparse(csvData);

      const zip = new JSZip();
      zip.file("contacts_export.csv", csvString);

      // Fetch attachments from IndexedDB and add them to the zip
      let attachmentCount = 0;
      for (const contact of contactsToExport) {
        if (contact.attachments && contact.attachments.length > 0) {
          const contactFolder = zip.folder(`attachments/${contact.firstName}_${contact.lastName}_${contact.id}`);
          for (const attachment of contact.attachments) {
            try {
              const fileBlob = await getAttachmentFromDB(attachment.id);
              if (fileBlob) {
                contactFolder?.file(attachment.name, fileBlob);
                attachmentCount++;
              } else {
                console.warn(`Attachment content not found in DB for ${attachment.name} (ID: ${attachment.id}) of contact ${contact.id}`);
              }
            } catch (dbError) {
              console.error(`Error fetching attachment ${attachment.name} for contact ${contact.id} from DB:`, dbError);
            }
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `finsculpt_crm_export_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Export Successful',
        description: `${contactsToExport.length} contacts and ${attachmentCount} attachments have been exported.`,
      });

    } catch (error) {
      console.error("Error during export:", error);
      toast({
        title: 'Export Failed',
        description: 'An error occurred while exporting data. Please check the console.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };


  if (isLoadingAuth || (!currentUser && !isLoadingAuth) ) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (currentUser?.role !== 'partner') {
    return (
      <Card className="mt-10">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive font-heading">
            <AlertTriangle className="mr-2 h-6 w-6" /> Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>You do not have permission to view this page. Please contact an administrator.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-heading flex items-center">
          <FileArchive className="mr-3 h-8 w-8 text-accent" /> Export Client Data
        </h1>
        <Button onClick={handleExport} disabled={isExporting || numSelected === 0} className="h-11 px-4 py-3">
          {isExporting ? 'Exporting...' : `Export Selected (${numSelected}) as ZIP`}
        </Button>
      </div>
      <CardDescription>
        Select contacts to include in the export. The export will be a ZIP file containing a CSV of contact data and any associated file attachments.
      </CardDescription>

      {loadingContacts ? (
         <Card>
            <CardHeader><CardTitle className="font-heading">Loading Contacts...</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center space-x-3 p-2 border-b">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-2 border-b">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    </div>
                ))}
            </CardContent>
         </Card>
      ) : contacts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No contacts available to export.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent dark:hover:bg-transparent border-b border-white/10 dark:border-white/5">
                  <TableHead className="w-[60px]">
                    <Checkbox
                      id="selectAllContacts"
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                      aria-label="Select all contacts"
                    />
                  </TableHead>
                  <TableHead className="text-foreground/80 dark:text-foreground/70">Name</TableHead>
                  <TableHead className="text-foreground/80 dark:text-foreground/70">Email</TableHead>
                  <TableHead className="text-foreground/80 dark:text-foreground/70">Company</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="hover:bg-white/5 dark:hover:bg-white/5 border-b border-white/10 dark:border-white/5 last:border-b-0"
                  >
                    <TableCell>
                      <Checkbox
                        id={`contact-${contact.id}`}
                        checked={!!selectedContacts[contact.id]}
                        onCheckedChange={() => handleSelectContact(contact.id)}
                        aria-label={`Select contact ${contact.firstName} ${contact.lastName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground flex items-center gap-3 py-3">
                       <Avatar className="h-8 w-8">
                        <AvatarImage src={contact.profilePictureUrl} alt={`${contact.firstName} ${contact.lastName}`} />
                        <AvatarFallback>{getFirstInitial(contact.firstName)}</AvatarFallback>
                      </Avatar>
                      {contact.firstName} {contact.lastName}
                    </TableCell>
                    <TableCell className="text-foreground/90 py-3">{contact.email}</TableCell>
                    <TableCell className="text-foreground/90 py-3">{contact.company || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
