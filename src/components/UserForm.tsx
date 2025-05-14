
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData } from '@/lib/utils';

const userRoleSchema = z.enum(['partner', 'employee']);

const userFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  role: userRoleSchema,
  // password: z.string().min(6, { message: "Password must be at least 6 characters" }).optional(), // For future auth
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  initialData?: User;
  onSave: (user: User) => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ initialData, onSave, onCancel }) => {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData || {
      name: '',
      email: '',
      role: 'employee', // Default to employee
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({ name: '', email: '', role: 'employee' });
    }
  }, [initialData, form]);

  const onSubmit = (data: UserFormValues) => {
    const userData: User = {
      ...data,
      id: initialData?.id || `user-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
    };

    const users = getData<User[]>(DataItemType.Users) || [];
    const existingUserIndex = users.findIndex(u => u.id === userData.id);

    if (existingUserIndex > -1) {
      users[existingUserIndex] = userData; // Update existing
    } else {
      users.push(userData); // Add new
    }
    saveData<User[]>(DataItemType.Users, users);
    onSave(userData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Password field for future use
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password {initialData ? '(Leave blank to keep unchanged)' : ''}</FormLabel>
              <FormControl>
                <Input type="password" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        */}
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (initialData ? 'Update User' : 'Add User')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UserForm;
