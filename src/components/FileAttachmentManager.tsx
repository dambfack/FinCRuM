
'use client';

import React, { useState, useCallback } from 'react';
import type { Contact, FileAttachmentMeta } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UploadCloud, FileText, ShieldCheck, Download, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime, cn } from '@/lib/utils';
import { storeFile, getFile, deleteFile } from '@/lib/indexeddb'; 
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface FileAttachmentManagerProps {
  contact: Contact;
  onAttachmentsUpdate: (updatedContact: Contact) => void; 
}

const FileAttachmentManager: React.FC<FileAttachmentManagerProps> = ({ contact, onAttachmentsUpdate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState(''); 
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get current user

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
    
    setIsUploading(true);

    const newAttachmentMeta: FileAttachmentMeta = {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
      contactId: contact.id,
      createdAt: new Date().toISOString(),
      encrypted: false, 
    };

    try {
      await storeFile(newAttachmentMeta.id, selectedFile); 

      const updatedAttachments = [...(contact.attachments || []), newAttachmentMeta];
      const updatedContact = { ...contact, attachments: updatedAttachments, updatedAt: new Date().toISOString() };

      onAttachmentsUpdate(updatedContact); 

      toast({
        title: 'File Attached',
        description: `${selectedFile.name} has been attached and stored locally.`,
      });

      setSelectedFile(null);
      setPassword('');
      
      const fileInput = document.getElementById('file-attachment-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error("Error attaching file:", error);
      toast({
        title: 'Attachment Error',
        description: `Could not store file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, attachmentName: string) => {
    if (currentUser?.role === 'employee') {
      toast({ title: "Permission Denied", description: "Employees cannot delete attachments.", variant: "destructive" });
      return;
    }
    if (!confirm(`Are you sure you want to delete '${attachmentName}'? This will remove the file and its metadata.`)) {
      return;
    }
    try {
      await deleteFile(attachmentId); 
      const updatedAttachments = (contact.attachments || []).filter(att => att.id !== attachmentId);
      const updatedContact = { ...contact, attachments: updatedAttachments, updatedAt: new Date().toISOString() };
      onAttachmentsUpdate(updatedContact); 
      toast({ title: 'Attachment Deleted', description: `'${attachmentName}' and its metadata removed.` });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: 'Deletion Error',
        description: `Could not delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleDownloadAttachment = async (attachment: FileAttachmentMeta) => {
    try {
      const fileBlob = await getFile(attachment.id);
      if (fileBlob) {
        const url = URL.createObjectURL(fileBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: 'Download Started',
          description: `Downloading '${attachment.name}'.`,
        });
      } else {
        toast({
          title: 'Download Error',
          description: `File content for '${attachment.name}' not found locally. It might have been deleted or not stored correctly.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast({
        title: 'Download Error',
        description: `Could not retrieve file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleViewAttachment = async (attachment: FileAttachmentMeta) => {
    try {
      const fileBlob = await getFile(attachment.id);
      if (!fileBlob) {
        toast({
          title: 'File Not Found',
          description: `File content for '${attachment.name}' not found locally.`,
          variant: 'destructive',
        });
        return;
      }

      const fileType = attachment.type.toLowerCase();
      const viewableTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain'];

      if (viewableTypes.some(type => fileType.startsWith(type.split('/')[0] + '/') || fileType === type)) {
        const url = URL.createObjectURL(fileBlob);
        window.open(url, '_blank');
      } else {
        handleDownloadAttachment(attachment);
      }
    } catch (error) {
      console.error("Error viewing/opening attachment:", error);
      toast({
        title: 'Open Error',
        description: `Could not open file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
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
          <CardTitle className="text-lg flex items-center font-heading"> {/* Removed tracking-wide */}
            <UploadCloud className="mr-2 h-5 w-5" />
            Attach New File
          </CardTitle>
          <CardDescription>Select a file to attach to this contact. Encryption is not yet implemented.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-attachment-input">File</Label>
            <Input id="file-attachment-input" type="file" onChange={handleFileChange} className="mt-1" />
          </div>
          <Button onClick={handleAttachFile} disabled={isUploading || !selectedFile} className="w-full md:w-auto h-11 px-4 py-3">
            {isUploading ? 'Attaching...' : 'Attach File'}
          </Button>
        </CardContent>
      </Card>

      {(contact.attachments && contact.attachments.length > 0) && (
        <Card className="bg-card/60 dark:bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center font-heading"> {/* Removed tracking-wide */}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contact.attachments.map((att) => (
                    <TableRow key={att.id} className="hover:bg-white/5 dark:hover:bg-white/5">
                      <TableCell className="font-medium truncate max-w-xs">
                        <button
                          onClick={() => handleViewAttachment(att)}
                          className="hover:underline text-accent hover:text-accent/80 text-left w-full truncate"
                          title={`Open ${att.name}`}
                        >
                          {att.name}
                        </button>
                      </TableCell>
                      <TableCell className="truncate max-w-xs" title={att.type}>{att.type || 'N/A'}</TableCell>
                      <TableCell>{formatFileSize(att.size)}</TableCell>
                      <TableCell>{formatDateTime(att.createdAt).split(',')[0]}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadAttachment(att)} title="Download File">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteAttachment(att.id, att.name)} 
                          title="Delete Attachment" 
                          className="text-destructive hover:text-destructive"
                          disabled={currentUser?.role === 'employee'} // Disable delete for employees
                        >
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
