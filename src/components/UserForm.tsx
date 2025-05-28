
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
  pin: z.string()
    .optional()
    .refine(val => !val || (/^\d{4}$/.test(val)), {
      message: "PIN must be 4 digits, or leave blank for no PIN.",
    }),
  profilePictureUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
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
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      role: initialData?.role || 'employee',
      pin: initialData?.pin || '',
      profilePictureUrl: initialData?.profilePictureUrl || ''
    },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({
      name: initialData?.name || '',
      email: initialData?.email || '',
      role: initialData?.role || 'employee',
      pin: initialData?.pin || '',
      profilePictureUrl: initialData?.profilePictureUrl || ''
    });
  }, [initialData, form]);

  const onSubmit = (data: UserFormValues) => {
    if (!data.name || !data.email || !data.role) {
      // This should be caught by form validation, but just in case
      console.error('Required fields are missing');
      return;
    }

    // Create user data with all required fields
    const userData: User = {
      id: initialData?.id || `user-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
      name: data.name,
      email: data.email,
      role: data.role,
      ...(data.pin && { pin: data.pin }),
      ...(data.profilePictureUrl && { profilePictureUrl: data.profilePictureUrl })
    };

    const users = getData<User[]>(DataItemType.Users) || [];
    const existingUserIndex = users.findIndex(u => u.id === userData.id);

    if (existingUserIndex > -1) {
      users[existingUserIndex] = userData;
    } else {
      users.push(userData);
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
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>4-Digit PIN (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="password" // Use password type to mask input
                  placeholder="Enter 4-digit PIN"
                  {...field}
                  maxLength={4}
                  pattern="\d*" // Allows only digits, but Zod handles full validation
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/\D/g, '');
                    field.onChange(numericValue);
                  }}
                />
              </FormControl>
              <FormDescription>
                Leave blank if no PIN is desired for this user.
              </FormDescription>
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
              <FormDescription>
                Enter a direct URL to an image.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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
