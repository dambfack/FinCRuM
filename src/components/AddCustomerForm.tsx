'use client';
import React from 'react';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, UserPlus, Mail, Phone, MapPin } from 'lucide-react';
import {
  Form,
  FieldValues,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';

import type { ExcelData, Contact } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataSync } from '@/hooks/use-data-sync';

const contactSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
});

// Dynamically create the schema based on headers in localStorage
const createCustomerSchema = (headers: string[], contactSchema: z.ZodObject<any>) => {
  const schemaObject = headers.reduce((acc, header) => {
      // Check if the header is a contact field.
    if (header === "contact") {
      acc[header] = z.string().min(1, { message: `At least one contact is required.` }).transform((str, ctx) => {
          try {
            return JSON.parse(str) as Contact[]; // Parse the JSON string to Contact[]
          } catch (e) {
            ctx.addIssue({ code: "custom", message: "Invalid contact data format." });
            return z.NEVER;
          }
      });
    } else {
      acc[header] = z.string().min(1, { message: `${header} is required.` });
    }
    return acc;
  }, {} as Record<string, z.ZodTypeAny>);
  return z.object(schemaObject);
};

type CustomerFormValues = z.infer<ReturnType<typeof createCustomerSchema>>;

const AddCustomerForm = () => {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      firstName: '',
      phone: '',
      id: crypto.randomUUID(),
    }
  ]);
    const addContact = useCallback(() => {
        setContacts(prevContacts => [...prevContacts, { firstName: '', phone: '', id: crypto.randomUUID() }]);
    }, []);
    
    const updateContact = useCallback((index: number, data: Partial<Contact>) => {
        setContacts(prevContacts => {
            const updatedContacts = [...prevContacts];
            updatedContacts[index] = { ...updatedContacts[index], ...data };
            return updatedContacts;
        });
    }, []);

    // Effect to update the form with contact changes
    useEffect(() => {
        form.setValue('contact', contacts);
    }, [contacts, form]);


  const removeContact = (index: number) => { setContacts(prevContacts => prevContacts.filter((_, i) => i !== index)); };

  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [CustomerSchema, setCustomerSchema] = useState<z.ZodObject<any> | null>(null); // State for the dynamic schema
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    try {
      const storedData = localStorage.getItem('customerData');
      if (storedData) {
        const parsedData: ExcelData = JSON.parse(storedData);
        if (parsedData && parsedData.headers && parsedData.headers.length > 0) {
          setHeaders(parsedData.headers);
          const dynamicSchema = createCustomerSchema(parsedData.headers, contactSchema);
          setCustomerSchema(dynamicSchema); // Set the schema in state
        } else {
          setError("No headers found in stored data. Cannot add customer. Please import data first.");
        }
      } else {
        setError("No customer data found. Please import a file first to establish data structure.");
      }
    } catch (err) {
      console.error("Error loading headers from localStorage:", err);
      setError("Failed to load data structure. Please try importing again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize the form *after* the schema is set
  const initializeDefaultValues = useCallback(() => {
    const defaultValues = headers.reduce((acc, header) => {
      if (header === "contact") {
        acc[header] = contacts;
      } else {
        acc[header] = "";
      }
      return acc;
    }, {} as Record<string, any>);
    return defaultValues;
  }, [headers, contacts]);

  const form = useForm<CustomerFormValues>({
    resolver: CustomerSchema ? zodResolver(CustomerSchema) : undefined, // Use schema from state
    defaultValues: initializeDefaultValues(),
  });

  useEffect(() => {
    if (CustomerSchema) {
      form.reset(initializeDefaultValues()); // Reset the form when the schema updates
    }
  }, [CustomerSchema, headers, form, initializeDefaultValues]);

  // Validate contacts using zod and update form errors
  const validateContacts = useCallback((contacts: Contact[]) => {
    const validationResults = contacts.map((contact) => contactSchema.safeParse(contact));

    validationResults.forEach((result, index) => {
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          // Use 'contact' for the form field key
          form.setError(`contact[${index}].${issue.path.join('.')}`, {
            type: "manual",
            message: issue.message,
          });
        });
      } else {
        // Clear any previous errors for this contact if valid
        form.clearErrors(`contact[${index}]`);
      }
    });
  }, [form]);

  // Trigger validation when contacts change
  useEffect(() => { validateContacts(contacts); }, [contacts, validateContacts]);


  const onSubmit = (values: CustomerFormValues) => {
    try {
      const storedData = localStorage.getItem('customerData');
      if (!storedData) {
        toast({ title: "Error", description: "No existing data found.", variant: "destructive" });
        return;
      }

      const parsedData: ExcelData = JSON.parse(storedData);
       if (!parsedData || !parsedData.headers || !parsedData.rows) {
          toast({ title: "Error", description: "Invalid data format in storage.", variant: "destructive" });
          return;
       }
       const newContacts = (values.contact as Contact[]);
       const contactsJSON = JSON.stringify(newContacts);

      // Ensure the order of values matches the headers
      const newRow = parsedData.headers.map(header => {
        if (header === "contact")          
            return contactsJSON; // Now a JSON string
        return values[header] ?? ""
      });

      parsedData.rows.push(newRow);
      localStorage.setItem('customerData', JSON.stringify(parsedData));
      

      toast({
        title: "Customer Added",
        description: "New customer details saved successfully.",
      });
      router.push('/data-grid'); // Redirect to see the updated grid

    } catch (error) {
      console.error("Failed to add customer:", error);
      toast({
        title: "Error Adding Customer",
        description: "Could not save customer data.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Form...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !CustomerSchema) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
             <AlertCircle className="h-5 w-5" /> Cannot Load Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error || "Form schema could not be generated."}</p>
          <Button variant="link" onClick={() => router.push('/import')} className="p-0 h-auto mt-2">
            Go to Import Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Details</CardTitle>
        <CardDescription>Fill in the information for the new customer.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {headers.map((header) => {
                    if (header === "contact") {
                        return (
                            <div key={header}>
                                <FormLabel>Contacts</FormLabel>
                                {contacts.map((contact, index) => (
                                    <div key={contact.id} className="mb-4 border p-4 rounded-md shadow-sm">
                                        <FormField
                                            control={form.control}
                                            name={`contact[${index}].firstName`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        <Mail className="h-4 w-4 mr-2 inline" />
                                                        Name
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Name" {...field} onChange={e => updateContact(index, { firstName: e.target.value })} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={form.control}
                                            name={`contact[${index}].phone`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        <Phone className="h-4 w-4 mr-2 inline" />
                                                        Phone
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Phone" {...field} onChange={e => updateContact(index, { phone: e.target.value })} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {index > 0 && (
                                            <Button type="button" variant="ghost" onClick={() => removeContact(index)} className="ml-auto mt-2">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={addContact}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Contact
                                </Button>
                            </div>
                        );
                    }
                    return (
                      <FormField key={header} control={form.control} name={header} render={({ field }) => (
                        <FormItem>
                          <FormLabel>{header}</FormLabel>
                          <FormControl>
                            <Input placeholder={`Enter ${header}`} {...field} />
                          </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <CardFooter className="px-0 pt-6">
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                    <UserPlus className="mr-2 h-4 w-4"/>
                    {form.formState.isSubmitting ? 'Adding...' : 'Add Customer'}
                 </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AddCustomerForm;
