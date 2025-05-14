
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData } from '@/lib/utils';
import UserTable from '@/components/UserTable';
import UserForm from '@/components/UserForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Users2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const { toast } = useToast();

  const loadUsers = useCallback(() => {
    setLoading(true);
    const storedUsers = getData<User[]>(DataItemType.Users) || [];
    // Sort users, perhaps alphabetically by name or by role
    setUsers(storedUsers.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  // handleDeleteUser would go here if implemented
  // const handleDeleteUser = (userId: string) => { ... };

  const handleSaveUser = () => {
    setIsFormModalOpen(false);
    setEditingUser(null);
    loadUsers(); // Reload users after save
    toast({
      title: editingUser ? 'User Updated' : 'User Added',
      description: `User details have been saved.`,
    });
  };
  
  const dialogContentClassName = "sm:max-w-lg glass-effect bg-card/80 dark:bg-card/70";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold font-heading flex items-center"> {/* Removed tracking-wide */}
            <Users2 className="mr-3 h-8 w-8 text-accent" /> Team Management
          </h1>
          <Skeleton className="h-11 w-36 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-heading flex items-center"> {/* Removed tracking-wide */}
          <Users2 className="mr-3 h-8 w-8 text-accent" /> Team Management
        </h1>
        <Button onClick={() => { setEditingUser(null); setIsFormModalOpen(true); }} className="h-11 px-4 py-3">
          <PlusCircle className="mr-2 h-5 w-5" />
          Add User
        </Button>
      </div>

      <UserTable 
        users={users} 
        onEditUser={handleEditUser} 
        // onDeleteUser={handleDeleteUser} // Pass if implemented
      />

      <Dialog open={isFormModalOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null); 
          }
          setIsFormModalOpen(open);
      }}>
        <DialogContent className={dialogContentClassName}>
          <DialogHeader>
            <DialogTitle className="font-heading">{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle> {/* Removed tracking-wide */}
            <DialogDescription>{editingUser ? "Update the user's details." : "Fill in the details to add a new user."}</DialogDescription>
          </DialogHeader>
          <UserForm
            initialData={editingUser || undefined}
            onSave={handleSaveUser}
            onCancel={() => { setIsFormModalOpen(false); setEditingUser(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
