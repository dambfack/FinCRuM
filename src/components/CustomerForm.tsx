
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Contact, FileAttachmentMeta, User } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData, createNotification, getFirstInitial } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageUp } from 'lucide-react';
import ImageCropperModal from './ImageCropperModal'; // Import the cropper modal

const contactDealStatusSchema = z.enum(['open', 'closed', 'missed', 'other']);

const fileAttachmentMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  contactId: z.string(),
  createdAt: z.string(),
  encrypted: z.boolean(),
});


const customerFormSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: contactDealStatusSchema.optional(),
  attachments: z.array(fileAttachmentMetaSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  assignedToUserId: z.string().optional(),
  profilePictureUrl: z.string().optional().or(z.literal('')), // Can be data URI or empty
  contactStatus: z.enum(['approved', 'pending_approval', 'pending_deletion']).optional(),
  changeProposal: z.any().optional(),
  lastModifiedByRole: z.enum(['partner', 'employee']).optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  initialData?: Contact;
  onSave?: (customer: Contact) => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ initialData, onSave }) => {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isCropperModalOpen, setIsCropperModalOpen] = useState(false);
  const [imageToCropSrc, setImageToCropSrc] = useState<string | null>(null);

  useEffect(() => {
    const loadedUsers = getData<User[]>(DataItemType.Users) || [];
    setAllUsers(loadedUsers);
  }, []);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: initialData ?
    {
        ...initialData,
        createdAt: initialData.createdAt instanceof Date ? initialData.createdAt.toISOString() : initialData.createdAt,
        updatedAt: initialData.updatedAt instanceof Date ? initialData.updatedAt.toISOString() : initialData.updatedAt,
        status: initialData.status || undefined,
        attachments: initialData.attachments || [],
        assignedToUserId: initialData.assignedToUserId || "none", 
        contactStatus: initialData.contactStatus || 'approved',
        changeProposal: initialData.changeProposal || undefined,
        lastModifiedByRole: initialData.lastModifiedByRole || undefined,
        profilePictureUrl: initialData.profilePictureUrl || '',
    }
    : {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      notes: '',
      status: undefined,
      attachments: [],
      assignedToUserId: "none", 
      contactStatus: 'approved',
      changeProposal: undefined,
      lastModifiedByRole: currentUser?.role,
      profilePictureUrl: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        createdAt: initialData.createdAt instanceof Date ? initialData.createdAt.toISOString() : initialData.createdAt,
        updatedAt: initialData.updatedAt instanceof Date ? initialData.updatedAt.toISOString() : initialData.updatedAt,
        status: initialData.status || undefined,
        attachments: initialData.attachments || [],
        assignedToUserId: initialData.assignedToUserId || "none",
        contactStatus: initialData.contactStatus || 'approved',
        changeProposal: initialData.changeProposal || undefined,
        lastModifiedByRole: initialData.lastModifiedByRole || undefined,
        profilePictureUrl: initialData.profilePictureUrl || '',
      });
      if (initialData.profilePictureUrl) {
        setImagePreview(initialData.profilePictureUrl);
      } else {
        setImagePreview(null);
      }
    } else {
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        notes: '',
        status: undefined,
        attachments: [],
        assignedToUserId: "none",
        contactStatus: 'approved',
        changeProposal: undefined,
        lastModifiedByRole: currentUser?.role,
        profilePictureUrl: '',
      });
      setImagePreview(null);
    }
  }, [initialData, form, currentUser]);

  const handleProfilePictureFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        toast({
          title: "Image Too Large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImageToCropSrc(dataUri);
        setIsCropperModalOpen(true);
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) { // Clear the file input so the same file can be selected again if needed
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCropSave = (croppedImageUrl: string) => {
    form.setValue('profilePictureUrl', croppedImageUrl);
    setImagePreview(croppedImageUrl);
    setIsCropperModalOpen(false);
    setImageToCropSrc(null);
  };

  const onSubmit = (data: CustomerFormValues) => {
    if (!currentUser) {
        toast({ title: "Error", description: "No authenticated user found. Cannot save.", variant: "destructive" });
        return;
    }
    const now = new Date().toISOString();
    let customerDataToSave: Contact;
    const contacts = getData<Contact[]>(DataItemType.Contacts) || [];
    const isNewContact = !initialData?.id;
    const contactId = initialData?.id || `contact-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;

    const finalAssignedToUserId = data.assignedToUserId === "none" ? undefined : data.assignedToUserId;

    const formInputAsContactShape: Partial<Contact> = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        address: data.address,
        notes: data.notes,
        status: data.status,
        assignedToUserId: finalAssignedToUserId,
        profilePictureUrl: data.profilePictureUrl || undefined,
    };

    if (currentUser.role === 'employee') {
        const baseContactDetails: Contact = {
            id: contactId,
            ...formInputAsContactShape,
            createdAt: initialData?.createdAt || now,
            updatedAt: now,
            attachments: initialData?.attachments || [],
            contactStatus: 'pending_approval',
            lastModifiedByRole: 'employee',
            changeProposal: formInputAsContactShape,
        } as Contact;

        if (isNewContact) {
            customerDataToSave = baseContactDetails;
        } else {
            customerDataToSave = {
                ...(initialData as Contact),
                ...baseContactDetails,
            };
        }

        const partners = allUsers.filter(u => u.role === 'partner');
        partners.forEach(partner => {
            createNotification({
                recipientUserId: partner.id,
                type: 'approval_request',
                title: `Contact Change: ${formInputAsContactShape.firstName} ${formInputAsContactShape.lastName}`,
                message: `Employee ${currentUser.name} has ${isNewContact ? 'added a new contact' : 'proposed changes to a contact'} requiring your approval.`,
                relatedItemId: contactId,
                relatedItemType: DataItemType.Contacts,
                payload: { proposedData: formInputAsContactShape, originalData: isNewContact ? null : initialData }
            });
        });
        toast({ title: "Changes Submitted", description: "Your changes have been submitted for partner approval." });

    } else { 
        customerDataToSave = {
            id: contactId,
            ...formInputAsContactShape,
            createdAt: initialData?.createdAt || now,
            updatedAt: now,
            attachments: initialData?.attachments || [],
            contactStatus: 'approved',
            lastModifiedByRole: 'partner',
            changeProposal: undefined,
        } as Contact;
         toast({ title: initialData ? "Customer Updated" : "Customer Added", description: `${customerDataToSave.firstName} ${customerDataToSave.lastName} has been saved.` });
    }

    try {
      const existingContactIndex = contacts.findIndex(c => c.id === customerDataToSave.id);
      if (existingContactIndex > -1) {
        contacts[existingContactIndex] = customerDataToSave;
      } else {
        contacts.push(customerDataToSave);
      }
      saveData<Contact[]>(DataItemType.Contacts, contacts);
      onSave?.(customerDataToSave);
      if (!initialData && currentUser.role === 'partner') {
        form.reset();
        setImagePreview(null);
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        title: "Error",
        description: "Could not save customer details. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading tracking-wide">{initialData ? 'Edit Customer' : 'Add New Customer'}</CardTitle>
          {!initialData && <CardDescription>Fill in the details to add a new customer to your records.</CardDescription>}
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              <div className="flex flex-col items-center space-y-3 mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={imagePreview || undefined} alt={`${form.getValues('firstName') || ''} ${form.getValues('lastName') || ''}`} />
                  <AvatarFallback className="text-3xl">
                    {getFirstInitial(form.getValues('firstName')) || '?'}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageUp className="mr-2 h-4 w-4" />
                  {imagePreview ? 'Change Picture' : 'Upload Picture'}
                </Button>
                {form.formState.errors.profilePictureUrl && (
                  <p className="text-sm text-destructive">{form.formState.errors.profilePictureUrl.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="123-456-7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Status (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select deal status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open (Deal in Progress)</SelectItem>
                        <SelectItem value="closed">Closed (Deal Won)</SelectItem>
                        <SelectItem value="missed">Missed (Deal Lost)</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="profilePictureUrl"
                  render={({ field }) => (
                      <FormItem className="hidden">
                          <FormControl>
                              <Input type="text" {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="123 Main St, Anytown, USA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about the customer..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedToUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to User (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user to assign" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {allUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting} className="h-11 px-4 py-3">
                {form.formState.isSubmitting ? 'Saving...' :
                  (currentUser?.role === 'employee' ? (initialData ? 'Submit Changes for Approval' : 'Add Contact for Approval') :
                  (initialData ? 'Update Customer' : 'Add Customer'))}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      {imageToCropSrc && (
        <ImageCropperModal
          isOpen={isCropperModalOpen}
          onClose={() => {
            setIsCropperModalOpen(false);
            setImageToCropSrc(null);
          }}
          imageSrc={imageToCropSrc}
          onCropSave={handleCropSave}
          aspectRatio={1 / 1} 
        />
      )}
    </>
  );
};

export default CustomerForm;

