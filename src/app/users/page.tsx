'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  UserPlus,
  Shield,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getData, saveData } from '@/lib/utils';
import { DataItemType, User } from '@/lib/types';


import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'partner' | 'employee';
  department: string;
  phone: string;
  isActive: boolean;
  permissions: {
    canCreateUsers: boolean;
    canDeleteUsers: boolean;
    canModifyUsers: boolean;
    canManageUsers: boolean;
    canViewAllContacts: boolean;
    canModifyAllContacts: boolean;
    canDeleteContacts: boolean;
    canApproveChanges: boolean;
    canAccessReports: boolean;
    canManageSettings: boolean;
    canSyncToCloud: boolean;
    canViewCustomers: boolean;
    canEditCustomers: boolean;
    canDeleteCustomers: boolean;
    canViewAppointments: boolean;
    canEditAppointments: boolean;
    canViewTasks: boolean;
    canEditTasks: boolean;
    canViewReports: boolean;
  };
}

const defaultPermissions: { [key: string]: any } = {
  admin: {
    canCreateUsers: true,
    canDeleteUsers: true,
    canModifyUsers: true,
    canManageUsers: true,
    canViewAllContacts: true,
    canModifyAllContacts: true,
    canDeleteContacts: true,
    canApproveChanges: true,
    canAccessReports: true,
    canManageSettings: true,
    canSyncToCloud: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canViewAppointments: true,
    canEditAppointments: true,
    canViewTasks: true,
    canEditTasks: true,
    canViewReports: true
  },
  partner: {
    canCreateUsers: true,
    canDeleteUsers: false,
    canModifyUsers: true,
    canManageUsers: false,
    canViewAllContacts: true,
    canModifyAllContacts: true,
    canDeleteContacts: false,
    canApproveChanges: true,
    canAccessReports: true,
    canManageSettings: false,
    canSyncToCloud: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,
    canViewAppointments: true,
    canEditAppointments: true,
    canViewTasks: true,
    canEditTasks: true,
    canViewReports: true
  },
  employee: {
    canCreateUsers: false,
    canDeleteUsers: false,
    canModifyUsers: false,
    canManageUsers: false,
    canViewAllContacts: false,
    canModifyAllContacts: false,
    canDeleteContacts: false,
    canApproveChanges: false,
    canAccessReports: false,
    canManageSettings: false,
    canSyncToCloud: false,
    canViewCustomers: true,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canViewAppointments: true,
    canEditAppointments: false,
    canViewTasks: true,
    canEditTasks: true,
    canViewReports: false
  }
};

const UserManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [userForm, setUserForm] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'employee',
    department: '',
    phone: '',
    isActive: true,
    permissions: defaultPermissions.employee
  });

  // Check if current user has permission to manage users
  const canManageUsers = currentUser?.role === 'admin' || currentUser?.permissions?.canManageUsers;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const userData = (getData(DataItemType.Users) as User[]) || [];
      setUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleAddUser = () => {
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      role: 'employee',
      department: '',
      phone: '',
      isActive: true,
      permissions: defaultPermissions.employee
    });
    setIsAddUserOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || 'employee',
      department: user.department || '',
      phone: user.phone || '',
      isActive: user.isActive !== false,
      permissions: user.permissions || defaultPermissions[user.role || 'employee']
    });
    setIsEditUserOpen(true);
  };

  const handleRoleChange = (role: 'admin' | 'partner' | 'employee') => {
    setUserForm({
      ...userForm,
      role,
      permissions: defaultPermissions[role] || defaultPermissions.employee
    });
  };

  const handleSaveUser = () => {
    if (!userForm.firstName || !userForm.lastName || !userForm.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newUser: User = {
      id: selectedUser?.id || `user_${Date.now()}`,
      name: `${userForm.firstName} ${userForm.lastName}`,
      firstName: userForm.firstName,
      lastName: userForm.lastName,
      email: userForm.email,
      role: userForm.role,
      department: userForm.department,
      phone: userForm.phone,
      isActive: userForm.isActive,
      permissions: userForm.permissions,
      createdAt: selectedUser?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updatedUsers;
    if (selectedUser) {
      // Update existing user
      updatedUsers = users.map(user => user.id === selectedUser.id ? newUser : user);
      toast({
        title: "User Updated",
        description: `${newUser.firstName} ${newUser.lastName} has been updated successfully.`
      });
    } else {
      // Add new user
      updatedUsers = [...users, newUser];
      toast({
        title: "User Added",
        description: `${newUser.firstName} ${newUser.lastName} has been added successfully.`
      });
    }

    setUsers(updatedUsers);
    saveData(DataItemType.Users, updatedUsers);
    setIsAddUserOpen(false);
    setIsEditUserOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account.",
        variant: "destructive"
      });
      return;
    }

    const updatedUsers = users.filter(u => u.id !== user.id);
    setUsers(updatedUsers);
    saveData(DataItemType.Users, updatedUsers);
    
    toast({
      title: "User Deleted",
      description: `${user.firstName} ${user.lastName} has been removed.`
    });
  };

  const toggleUserStatus = (user: User) => {
    if (user.id === currentUser?.id) {
      toast({
        title: "Error",
        description: "You cannot deactivate your own account.",
        variant: "destructive"
      });
      return;
    }

    const updatedUsers = users.map(u => 
      u.id === user.id ? { ...u, isActive: !u.isActive } : u
    );
    setUsers(updatedUsers);
    saveData(DataItemType.Users, updatedUsers);
    
    toast({
      title: user.isActive ? "User Deactivated" : "User Activated",
      description: `${user.firstName} ${user.lastName} has been ${user.isActive ? 'deactivated' : 'activated'}.`
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'partner': return 'secondary';
      case 'employee': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? 'default' : 'secondary';
  };

  if (!canManageUsers) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access user management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage team members and their permissions
          </p>
        </div>
        <Button onClick={handleAddUser} className="flex items-center space-x-2">
          <UserPlus className="h-4 w-4" />
          <span>Add User</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.isActive !== false).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'employee').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and their access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.profilePictureUrl} />
                          <AvatarFallback>
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role || 'employee')}>
                        {user.role || 'employee'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.isActive !== false)}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleUserStatus(user)}>
                            {user.isActive !== false ? (
                              <><UserX className="mr-2 h-4 w-4" />Deactivate</>
                            ) : (
                              <><UserCheck className="mr-2 h-4 w-4" />Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account and set their permissions
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={userForm.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                    placeholder="Enter department"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={userForm.isActive}
                  onCheckedChange={(checked) => setUserForm({ ...userForm, isActive: checked })}
                />
                <Label htmlFor="isActive">Active User</Label>
              </div>
            </TabsContent>
            
            <TabsContent value="permissions" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Customer Management</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canViewCustomers}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canViewCustomers: checked }
                        })}
                      />
                      <Label>View Customers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canEditCustomers}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canEditCustomers: checked }
                        })}
                      />
                      <Label>Edit Customers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canDeleteCustomers}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canDeleteCustomers: checked }
                        })}
                      />
                      <Label>Delete Customers</Label>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-medium">Appointments & Tasks</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canViewAppointments}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canViewAppointments: checked }
                        })}
                      />
                      <Label>View Appointments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canEditAppointments}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canEditAppointments: checked }
                        })}
                      />
                      <Label>Edit Appointments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canViewTasks}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canViewTasks: checked }
                        })}
                      />
                      <Label>View Tasks</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canEditTasks}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canEditTasks: checked }
                        })}
                      />
                      <Label>Edit Tasks</Label>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-medium">System Access</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canViewReports}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canViewReports: checked }
                        })}
                      />
                      <Label>View Reports</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canManageUsers}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canManageUsers: checked }
                        })}
                      />
                      <Label>Manage Users</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canManageSettings}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canManageSettings: checked }
                        })}
                      />
                      <Label>Manage Settings</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              Add User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First Name *</Label>
                  <Input
                    id="editFirstName"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last Name *</Label>
                  <Input
                    id="editLastName"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email Address *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editRole">Role</Label>
                  <Select value={userForm.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editDepartment">Department</Label>
                  <Input
                    id="editDepartment"
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                    placeholder="Enter department"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone Number</Label>
                <Input
                  id="editPhone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="editIsActive"
                  checked={userForm.isActive}
                  onCheckedChange={(checked) => setUserForm({ ...userForm, isActive: checked })}
                />
                <Label htmlFor="editIsActive">Active User</Label>
              </div>
            </TabsContent>
            
            <TabsContent value="permissions" className="space-y-4">
              {/* Same permissions content as Add User */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Customer Management</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canViewCustomers}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canViewCustomers: checked }
                        })}
                      />
                      <Label>View Customers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canEditCustomers}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canEditCustomers: checked }
                        })}
                      />
                      <Label>Edit Customers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canDeleteCustomers}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canDeleteCustomers: checked }
                        })}
                      />
                      <Label>Delete Customers</Label>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-medium">Appointments & Tasks</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canViewAppointments}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canViewAppointments: checked }
                        })}
                      />
                      <Label>View Appointments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canEditAppointments}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canEditAppointments: checked }
                        })}
                      />
                      <Label>Edit Appointments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canViewTasks}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canViewTasks: checked }
                        })}
                      />
                      <Label>View Tasks</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canEditTasks}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canEditTasks: checked }
                        })}
                      />
                      <Label>Edit Tasks</Label>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-medium">System Access</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canViewReports}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canViewReports: checked }
                        })}
                      />
                      <Label>View Reports</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canManageUsers}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canManageUsers: checked }
                        })}
                      />
                      <Label>Manage Users</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userForm.permissions.canManageSettings}
                        onCheckedChange={(checked) => setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canManageSettings: checked }
                        })}
                      />
                      <Label>Manage Settings</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              Update User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;