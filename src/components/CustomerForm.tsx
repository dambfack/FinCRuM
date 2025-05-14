
'use client';

import React, { useEffect, useState } from 'react'; // Added useState
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
import { getData, saveData, createNotification } from '@/lib/utils'; // Added createNotification
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

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
  status: contactDealStatusSchema.optional(), // Deal status
  attachments: z.array(fileAttachmentMetaSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  assignedToUserId: z.string().optional(),
  profilePictureUrl: z.string().url({ message: "Please enter a valid URL for the profile picture." }).optional().or(z.literal('')),
  // Approval flow fields - not directly in form, but handled by logic
  contactStatus: z.enum(['approved', 'pending_approval', 'pending_deletion']).optional(),
  changeProposal: z.any().optional(), // Using z.any() for Partial<Contact> for simplicity
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
  const { currentUser } = useAuth(); // Get current user
  const [allUsers, setAllUsers] = useState<User[]>([]);

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
        status: initialData.status || undefined, // Deal status
        attachments: initialData.attachments || [],
        assignedToUserId: initialData.assignedToUserId || undefined, // Let placeholder show if undefined
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
      status: undefined, // Deal status
      attachments: [],
      assignedToUserId: undefined, // Default to undefined for placeholder
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
        assignedToUserId: initialData.assignedToUserId || undefined,
        contactStatus: initialData.contactStatus || 'approved',
        changeProposal: initialData.changeProposal || undefined,
        lastModifiedByRole: initialData.lastModifiedByRole || undefined,
        profilePictureUrl: initialData.profilePictureUrl || '',
      });
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
        assignedToUserId: undefined,
        contactStatus: 'approved',
        changeProposal: undefined,
        lastModifiedByRole: currentUser?.role,
        profilePictureUrl: '',
      });
    }
  }, [initialData, form, currentUser]);

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
        status: data.status, // Deal status
        assignedToUserId: finalAssignedToUserId,
        profilePictureUrl: data.profilePictureUrl || undefined,
        // attachments are handled by FileAttachmentManager
    };


    if (currentUser.role === 'employee') {
        const baseContactDetails: Contact = {
            id: contactId,
            ...formInputAsContactShape,
            createdAt: initialData?.createdAt || now,
            updatedAt: now,
            attachments: initialData?.attachments || [], // Keep existing attachments unless explicitly managed
            contactStatus: 'pending_approval',
            lastModifiedByRole: 'employee',
            changeProposal: formInputAsContactShape, // Employee's proposed changes
        } as Contact; // Added 'as Contact' to satisfy type, assuming other required fields are there

        if (isNewContact) {
            customerDataToSave = baseContactDetails;
        } else {
            // For existing contact, preserve original fields not being proposed for change
            customerDataToSave = {
                ...(initialData as Contact), // Start with original approved data
                ...baseContactDetails, // Apply ID, timestamps, approval status, and proposal
                // Crucially, the main fields (firstName, etc.) are NOT directly updated here
                // They are in `changeProposal`. The `initialData` here is the *approved* version.
            };
        }

        // Notify partners
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

    } else { // Partner is saving
        customerDataToSave = {
            id: contactId,
            ...formInputAsContactShape,
            createdAt: initialData?.createdAt || now,
            updatedAt: now,
            attachments: initialData?.attachments || [],
            contactStatus: 'approved',
            lastModifiedByRole: 'partner',
            changeProposal: undefined, // Clear any pending proposals
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
      if (!initialData && currentUser.role === 'partner') form.reset(); // Only reset for partner on new, employee form stays for pending
      else if (!initialData && currentUser.role === 'employee') { /* Potentially clear form or indicate pending state */ }


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
    <Card>
      <CardHeader>
        <CardTitle className="font-heading tracking-wide">{initialData ? 'Edit Customer' : 'Add New Customer'}</CardTitle>
        {!initialData && <CardDescription>Fill in the details to add a new customer to your records.</CardDescription>}
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto pr-2"> {/* Added max-height and overflow */}
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
              name="status" // Deal status
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
                <FormItem>
                  <FormLabel>Profile Picture URL (Optional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/image.jpg" {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value || "none"}> {/* Use value prop and handle undefined for placeholder */}
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user to assign" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem> {/* Changed value from "" to "none" */}
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
  );
};

export default CustomerForm;
