import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, UserPlus, Edit, Trash2, Key, Eye, EyeOff, Plus, Cloud, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateUserFormData {
  name: string;
  email: string;
  role: 'admin' | 'partner' | 'employee';
  pin: string;
  confirmPin: string;
}

const UserManagementScreen: React.FC = () => {
  const { currentUser, createUser, getAllUsers, changePin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateUserFormData>({
    name: '',
    email: '',
    role: 'employee',
    pin: '',
    confirmPin: ''
  });
  const [pinChangeData, setPinChangeData] = useState({
    oldPin: '',
    newPin: '',
    confirmNewPin: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const result = await getAllUsers();
      if (result.success && result.users) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createFormData.name || !createFormData.email || !createFormData.pin) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (createFormData.pin !== createFormData.confirmPin) {
      toast({
        title: "PIN Mismatch",
        description: "PIN and confirmation PIN do not match.",
        variant: "destructive"
      });
      return;
    }

    if (createFormData.pin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createUser({
        name: createFormData.name,
        email: createFormData.email,
        role: createFormData.role
      }, createFormData.pin);

      if (result.success) {
        setShowCreateDialog(false);
        setCreateFormData({
          name: '',
          email: '',
          role: 'employee',
          pin: '',
          confirmPin: ''
        });
        await loadUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePin = async () => {
    if (!pinChangeData.oldPin || !pinChangeData.newPin) {
      toast({
        title: "Validation Error",
        description: "Please fill in all PIN fields.",
        variant: "destructive"
      });
      return;
    }

    if (pinChangeData.newPin !== pinChangeData.confirmNewPin) {
      toast({
        title: "PIN Mismatch",
        description: "New PIN and confirmation do not match.",
        variant: "destructive"
      });
      return;
    }

    if (pinChangeData.newPin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await changePin(pinChangeData.oldPin, pinChangeData.newPin);
      
      if (result.success) {
        setShowPinDialog(false);
        setPinChangeData({
          oldPin: '',
          newPin: '',
          confirmNewPin: ''
        });
      }
    } catch (error) {
      console.error('Error changing PIN:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'partner':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'employee':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'partner':
        return <Users className="w-4 h-4" />;
      case 'employee':
        return <UserPlus className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const canCreateUsers = currentUser?.permissions?.canCreateUsers;
  const canModifyUsers = currentUser?.permissions?.canModifyUsers;

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You must be logged in to access user management.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!canCreateUsers && !canModifyUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to manage users.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Key className="w-4 h-4 mr-2" />
                Change PIN
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Your PIN</DialogTitle>
                <DialogDescription>
                  Enter your current PIN and choose a new 4-digit PIN.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPin">Current PIN</Label>
                  <Input
                    id="oldPin"
                    type="password"
                    value={pinChangeData.oldPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 4) {
                        setPinChangeData(prev => ({ ...prev, oldPin: val }));
                      }
                    }}
                    placeholder="Enter current PIN"
                    maxLength={4}
                    className="text-center text-lg tracking-[0.5em]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPin">New PIN</Label>
                  <Input
                    id="newPin"
                    type="password"
                    value={pinChangeData.newPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 4) {
                        setPinChangeData(prev => ({ ...prev, newPin: val }));
                      }
                    }}
                    placeholder="Enter new PIN"
                    maxLength={4}
                    className="text-center text-lg tracking-[0.5em]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPin">Confirm New PIN</Label>
                  <Input
                    id="confirmNewPin"
                    type="password"
                    value={pinChangeData.confirmNewPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 4) {
                        setPinChangeData(prev => ({ ...prev, confirmNewPin: val }));
                      }
                    }}
                    placeholder="Confirm new PIN"
                    maxLength={4}
                    className="text-center text-lg tracking-[0.5em]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPinDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleChangePin} disabled={isLoading}>
                  {isLoading ? 'Changing...' : 'Change PIN'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {canCreateUsers && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user account to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={createFormData.name}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createFormData.email}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={createFormData.role} onValueChange={(value: 'admin' | 'partner' | 'employee') => setCreateFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Employee
                          </div>
                        </SelectItem>
                        <SelectItem value="partner">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Partner
                          </div>
                        </SelectItem>
                        {currentUser.role === 'admin' && (
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Admin
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin">4-Digit PIN</Label>
                    <div className="relative">
                      <Input
                        id="pin"
                        type={showPin ? "text" : "password"}
                        value={createFormData.pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 4) {
                            setCreateFormData(prev => ({ ...prev, pin: val }));
                          }
                        }}
                        placeholder="Enter PIN"
                        maxLength={4}
                        className="text-center text-lg tracking-[0.5em] pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPin(!showPin)}
                      >
                        {showPin ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPin">Confirm PIN</Label>
                    <div className="relative">
                      <Input
                        id="confirmPin"
                        type={showConfirmPin ? "text" : "password"}
                        value={createFormData.confirmPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 4) {
                            setCreateFormData(prev => ({ ...prev, confirmPin: val }));
                          }
                        }}
                        placeholder="Confirm PIN"
                        maxLength={4}
                        className="text-center text-lg tracking-[0.5em] pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                      >
                        {showConfirmPin ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Accounts
          </CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Cloud className="w-6 h-6 animate-pulse mr-2" />
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.profilePictureUrl} alt={user.name} />
                    <AvatarFallback className="text-sm font-medium">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{user.name}</h3>
                      <Badge className={`${getRoleBadgeColor(user.role)} flex items-center gap-1`}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </Badge>
                      {user.id === currentUser.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Created: {formatDate(user.createdAt)}</span>
                      <span>Last Login: {formatDate(user.lastLoginAt)}</span>
                      <div className="flex items-center gap-1">
                        {user.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-red-500" />
                            Inactive
                          </>
                        )}
                      </div>
                      {user.deviceIds && user.deviceIds.length > 0 && (
                        <span>{user.deviceIds.length} device{user.deviceIds.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canModifyUsers && user.id !== currentUser.id && (
                      <>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementScreen;