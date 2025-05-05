'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
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
import type { ExcelData } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, UserPlus } from 'lucide-react';

// Dynamically create the schema based on headers in localStorage
const createCustomerSchema = (headers: string[]) => {
    const schemaObject = headers.reduce((acc, header) => {
        // Basic validation: require all fields as strings. Enhance as needed.
        acc[header] = z.string().min(1, { message: `${header} is required.` });
        return acc;
    }, {} as Record<string, z.ZodString>);
    return z.object(schemaObject);
};

type CustomerFormData = z.infer<ReturnType<typeof createCustomerSchema>>;

const AddCustomerForm = () => {
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
          const dynamicSchema = createCustomerSchema(parsedData.headers);
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
  const form = useForm<CustomerFormData>({
    resolver: CustomerSchema ? zodResolver(CustomerSchema) : undefined, // Use schema from state
    defaultValues: headers.reduce((acc, header) => {
        acc[header] = ""; // Initialize fields based on headers
        return acc;
    }, {} as Record<string, string>)
  });

  // Reset form default values when headers/schema change
  useEffect(() => {
    if (CustomerSchema) {
      form.reset(headers.reduce((acc, header) => {
          acc[header] = "";
          return acc;
      }, {} as Record<string, string>));
    }
  }, [CustomerSchema, headers, form]);


  const onSubmit = (values: CustomerFormData) => {
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

      // Ensure the order of values matches the headers
      const newRow = parsedData.headers.map(header => values[header] ?? ""); // Use empty string if somehow missing

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
              {headers.map((header) => (
                <FormField
                  key={header}
                  control={form.control}
                  name={header}
                  render={({ field }) => (
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
