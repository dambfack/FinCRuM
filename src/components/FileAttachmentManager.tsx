
'use client';

import React, { useState, useCallback } from 'react';
import type { Contact, FileAttachmentMeta } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UploadCloud, FileText, ShieldCheck, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';

interface FileAttachmentManagerProps {
  contact: Contact;
  onAttachmentsUpdate: (updatedContact: Contact) => void; // Callback to update the contact in parent/localStorage
}

const FileAttachmentManager: React.FC<FileAttachmentManagerProps> = ({ contact, onAttachmentsUpdate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState(''); // For dummy encryption password
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleAttachFile = async () => {
    if (!selectedFile) {
      toast({ title: 'No File Selected', description: 'Please select a file to attach.', variant: 'destructive' });
      return;
    }
    // In a real scenario, prompt for a real password for encryption here
    if (!password.trim() && false) { // Password requirement disabled for now
      toast({ title: 'Password Required', description: 'Please enter a password for encryption.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    // Simulate attachment process (no actual encryption or file storage here)
    const newAttachment: FileAttachmentMeta = {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
      contactId: contact.id,
      createdAt: new Date().toISOString(),
      encrypted: true, // Assume it would be encrypted
      ivHex: 'dummyIVhex', // Placeholder
      saltHex: 'dummySALTHex', // Placeholder
    };

    const updatedAttachments = [...(contact.attachments || []), newAttachment];
    const updatedContact = { ...contact, attachments: updatedAttachments, updatedAt: new Date().toISOString() };

    // Call the callback to update the contact in the parent and localStorage
    onAttachmentsUpdate(updatedContact);

    toast({
      title: 'File Attached (Metadata)',
      description: `${selectedFile.name} metadata has been added. Actual file content and encryption are not implemented in this prototype.`,
    });

    setSelectedFile(null);
    setPassword('');
    setIsUploading(false);
    // Clear the file input
    const fileInput = document.getElementById('file-attachment-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this file attachment metadata? This action cannot be undone.')) {
      return;
    }
    const updatedAttachments = (contact.attachments || []).filter(att => att.id !== attachmentId);
    const updatedContact = { ...contact, attachments: updatedAttachments, updatedAt: new Date().toISOString() };
    onAttachmentsUpdate(updatedContact);
    toast({ title: 'Attachment Deleted', description: 'File attachment metadata removed.' });
  };

  const handleDownloadAttachment = (attachment: FileAttachmentMeta) => {
    // Simulate download / decryption prompt
    toast({
      title: 'Download Initiated (Mock)',
      description: `In a real app, '${attachment.name}' would be decrypted (if needed) and downloaded. File content is not stored in this prototype.`,
    });
    // const userPassword = prompt(`Enter password to decrypt and download ${attachment.name}:`);
    // if (userPassword) {
    //   // Decryption logic would go here
    //   console.log(`Simulating decryption of ${attachment.name} with password: ${userPassword}`);
    // }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  return (
    <div className="space-y-6">
      <Card className="bg-card/60 dark:bg-card/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center font-heading tracking-wide">
            <UploadCloud className="mr-2 h-5 w-5" />
            Attach New File
          </CardTitle>
          <CardDescription>Select a file and provide a password (for intended encryption).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-attachment-input">File</Label>
            <Input id="file-attachment-input" type="file" onChange={handleFileChange} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="file-password">Encryption Password (Mock)</Label>
            <Input
              id="file-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (mock)"
              className="mt-1"
              disabled // Disabled as actual encryption is not implemented
            />
             <p className="text-xs text-muted-foreground mt-1">Note: Actual file encryption is not implemented in this prototype.</p>
          </div>
          <Button onClick={handleAttachFile} disabled={isUploading || !selectedFile} className="w-full md:w-auto h-11 px-4 py-3">
            {isUploading ? 'Attaching...' : 'Attach File Metadata'}
          </Button>
        </CardContent>
      </Card>

      {(contact.attachments && contact.attachments.length > 0) && (
        <Card className="bg-card/60 dark:bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center font-heading tracking-wide">
              <FileText className="mr-2 h-5 w-5" />
              Attached Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Attached On</TableHead>
                    <TableHead className="text-center">Encrypted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contact.attachments.map((att) => (
                    <TableRow key={att.id} className="hover:bg-white/5 dark:hover:bg-white/5">
                      <TableCell className="font-medium truncate max-w-xs" title={att.name}>{att.name}</TableCell>
                      <TableCell className="truncate max-w-xs" title={att.type}>{att.type || 'N/A'}</TableCell>
                      <TableCell>{formatFileSize(att.size)}</TableCell>
                      <TableCell>{formatDateTime(att.createdAt).split(',')[0]}</TableCell>
                      <TableCell className="text-center">
                        {att.encrypted ? <ShieldCheck className="h-5 w-5 text-green-500 mx-auto" /> : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadAttachment(att)} title="Download (Mock)">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAttachment(att.id)} title="Delete Attachment" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileAttachmentManager;
