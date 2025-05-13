'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData } from '@/lib/utils';
import { useRouter } from 'next/navigation'; // For redirecting

const customerFormSchema = z.object({
  id: z.string().optional(), // Optional for new customers
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(), // Will be set on save
  updatedAt: z.string().optional(), // Will be set on save
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  initialData?: Contact; // For editing existing customer
  onSave?: (customer: Contact) => void; // Optional: callback after saving
}

const CustomerForm: React.FC<CustomerFormProps> = ({ initialData, onSave }) => {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: initialData ? 
    {
        ...initialData,
        createdAt: initialData.createdAt instanceof Date ? initialData.createdAt.toISOString() : initialData.createdAt,
        updatedAt: initialData.updatedAt instanceof Date ? initialData.updatedAt.toISOString() : initialData.updatedAt,
    } 
    : {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        createdAt: initialData.createdAt instanceof Date ? initialData.createdAt.toISOString() : initialData.createdAt,
        updatedAt: initialData.updatedAt instanceof Date ? initialData.updatedAt.toISOString() : initialData.updatedAt,
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: CustomerFormValues) => {
    const now = new Date().toISOString();
    const customerData: Contact = {
      ...data,
      id: initialData?.id || `contact-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, // Generate ID if new
      createdAt: initialData?.createdAt || now,
      updatedAt: now,
    } as Contact; // Type assertion because Zod schema dates are string, Contact dates are Date|string

    try {
      const contacts = getData<Contact[]>(DataItemType.Contacts) || [];
      const existingContactIndex = contacts.findIndex(c => c.id === customerData.id);

      if (existingContactIndex > -1) {
        contacts[existingContactIndex] = customerData; // Update existing
      } else {
        contacts.push(customerData); // Add new
      }
      saveData<Contact[]>(DataItemType.Contacts, contacts);
      
      toast({
        title: initialData ? "Customer Updated" : "Customer Added",
        description: `${customerData.firstName} ${customerData.lastName} has been saved.`,
      });
      
      onSave?.(customerData);
      // router.push('/data-grid'); // Or wherever you list customers
      if (!initialData) form.reset(); // Reset form only if it was a new customer entry

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
        <CardTitle>{initialData ? 'Edit Customer' : 'Add New Customer'}</CardTitle>
        {!initialData && <CardDescription>Fill in the details to add a new customer to your records.</CardDescription>}
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
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
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : (initialData ? 'Update Customer' : 'Add Customer')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default CustomerForm;
