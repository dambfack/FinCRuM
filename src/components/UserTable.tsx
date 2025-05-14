
'use client';

import React from 'react';
import type { User } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserTableProps {
  users: User[];
  onEditUser: (user: User) => void;
  onDeleteUser?: (userId: string) => void; // Optional for now
}

const getRoleBadgeVariant = (role: User['role']) => {
  switch (role) {
    case 'partner': return 'default'; 
    case 'employee': return 'secondary';
    default: return 'outline';
  }
};

const UserTable: React.FC<UserTableProps> = ({ users, onEditUser, onDeleteUser }) => {
  if (users.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No users found. Add one to get started!</p>;
  }

  return (
    <div className={cn(
      "overflow-x-auto rounded-xl border shadow-xl", 
      "bg-card/60 dark:bg-card/40 backdrop-blur-lg", 
      "border-white/20 dark:border-white/10" 
    )}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent dark:hover:bg-transparent border-b border-white/10 dark:border-white/5">
            <TableHead className="text-foreground/80 dark:text-foreground/70">Name</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Email</TableHead>
            <TableHead className="text-foreground/80 dark:text-foreground/70">Role</TableHead>
            <TableHead className="text-right w-[60px] text-foreground/80 dark:text-foreground/70">Actions</TableHead> 
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-white/5 dark:hover:bg-white/5 border-b border-white/10 dark:border-white/5 last:border-b-0">
              <TableCell className="font-medium text-foreground">
                {user.name}
              </TableCell>
              <TableCell className="text-foreground/90">{user.email}</TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role)} className={cn("capitalize",
                  user.role === 'partner' && 'bg-accent hover:bg-accent/90 text-accent-foreground',
                  user.role === 'employee' && 'bg-blue-500/80 hover:bg-blue-500/70 text-white'
                )}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/10">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-effect bg-popover/80 dark:bg-popover/60 border-white/10 dark:border-white/5">
                    <DropdownMenuItem onClick={() => onEditUser(user)} className="gap-2">
                      <Edit className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    {onDeleteUser && (
                      <DropdownMenuItem onClick={() => onDeleteUser(user.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2">
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserTable;
