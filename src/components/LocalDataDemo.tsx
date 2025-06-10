// src/components/LocalDataDemo.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LocalDataStatus } from './LocalDataStatus';
import { LocalDataSettings } from './LocalDataSettings';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { ConflictResolutionLog } from './ConflictResolutionLog';
import { useCloudDatabase } from '@/hooks/use-cloud-database';
import { 
  addOrUpdateItemWithCloudSync, 
  deleteItemByIdWithCloudSync, 
  getData 
} from '@/lib/utils';
import { DataItemType, type Contact, type Task } from '@/lib/types';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Users, 
  CheckSquare,
  Info,
  AlertTriangle,
  FileText
} from 'lucide-react';

export function LocalDataDemo() {
  const { state } = useCloudDatabase();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContactForm, setNewContactForm] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [showConflictLog, setShowConflictLog] = useState(false);

  // Load data on component mount and when data changes
  useEffect(() => {
    const loadData = () => {
      const contactsData = getData<Contact[]>(DataItemType.Contacts) || [];
      const tasksData = getData<Task[]>(DataItemType.Tasks) || [];
      setContacts(contactsData);
      setTasks(tasksData);
    };

    loadData();

    // Listen for data changes
    const handleDataChange = () => {
      loadData();
    };

    window.addEventListener('dataChanged', handleDataChange);
    return () => window.removeEventListener('dataChanged', handleDataChange);
  }, []);

  const handleAddContact = async () => {
    if (!newContactForm.name.trim()) return;

    setIsLoading(true);
    try {
      const newContact: Contact = {
        id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: newContactForm.name.trim(),
        email: newContactForm.email.trim() || undefined,
        phone: newContactForm.phone.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await addOrUpdateItemWithCloudSync(DataItemType.Contacts, newContact);
      
      if (success) {
        setNewContactForm({ name: '', email: '', phone: '' });
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateContact = async (contact: Contact) => {
    setIsLoading(true);
    try {
      await addOrUpdateItemWithCloudSync(DataItemType.Contacts, {
        ...contact,
        updatedAt: new Date().toISOString()
      });
      setEditingContact(null);
    } catch (error) {
      console.error('Failed to update contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    setIsLoading(true);
    try {
      await deleteItemByIdWithCloudSync(DataItemType.Contacts, contactId);
    } catch (error) {
      console.error('Failed to delete contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSampleTask = async () => {
    setIsLoading(true);
    try {
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: `Sample Task ${Date.now()}`,
        description: 'This is a sample task to demonstrate cloud sync',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addOrUpdateItemWithCloudSync(DataItemType.Tasks, newTask);
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Cloud Database Demo</h1>
        <p className="text-muted-foreground">
          Demonstration of shared database functionality across all authenticated users
        </p>
      </div>

      {/* Local Data Status */}
      <LocalDataStatus />
      
      {/* Conflict Resolution Features */}
      {(state.hasUnresolvedConflicts || showConflictLog) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Conflict Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.hasUnresolvedConflicts && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  There are {state.conflicts.length} unresolved conflicts that require your attention.
                  Please resolve them to ensure data consistency across all devices.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowConflictLog(!showConflictLog)}
                variant="outline"
              >
                <FileText className="mr-2 h-4 w-4" />
                {showConflictLog ? 'Hide' : 'Show'} Conflict Resolution Log
              </Button>
            </div>
            
            {showConflictLog && (
              <div className="mt-4">
                <ConflictResolutionLog />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Important Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Cloud Database Demo:</strong> This demo showcases the integrated cloud database system with manual conflict resolution. 
          Add, edit, or delete contacts and tasks to see real-time synchronization across devices. 
          When conflicts occur, you'll be prompted to manually resolve them, and all resolutions are logged for audit purposes.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contacts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contacts ({contacts.length})
            </CardTitle>
            <CardDescription>
              Shared contact database - visible to all users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Contact Form */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
              <Label className="font-medium">Add New Contact</Label>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  placeholder="Name *"
                  value={newContactForm.name}
                  onChange={(e) => setNewContactForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newContactForm.email}
                  onChange={(e) => setNewContactForm(prev => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  placeholder="Phone"
                  value={newContactForm.phone}
                  onChange={(e) => setNewContactForm(prev => ({ ...prev, phone: e.target.value }))}
                />
                <Button 
                  onClick={handleAddContact} 
                  disabled={isLoading || !newContactForm.name.trim()}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </div>

            {/* Contacts List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No contacts yet. Add one above!
                </p>
              ) : (
                contacts.map((contact) => (
                  <div key={contact.id} className="p-3 border rounded-lg">
                    {editingContact?.id === contact.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingContact.name}
                          onChange={(e) => setEditingContact(prev => prev ? { ...prev, name: e.target.value } : null)}
                        />
                        <Input
                          value={editingContact.email || ''}
                          onChange={(e) => setEditingContact(prev => prev ? { ...prev, email: e.target.value } : null)}
                          placeholder="Email"
                        />
                        <Input
                          value={editingContact.phone || ''}
                          onChange={(e) => setEditingContact(prev => prev ? { ...prev, phone: e.target.value } : null)}
                          placeholder="Phone"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateContact(editingContact)} disabled={isLoading}>
                            <Save className="mr-1 h-3 w-3" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingContact(null)}>
                            <X className="mr-1 h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          {contact.email && <p className="text-sm text-muted-foreground">{contact.email}</p>}
                          {contact.phone && <p className="text-sm text-muted-foreground">{contact.phone}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingContact(contact)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteContact(contact.id)} disabled={isLoading}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Tasks ({tasks.length})
            </CardTitle>
            <CardDescription>
              Shared task database - visible to all users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleAddSampleTask} disabled={isLoading} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Sample Task
            </Button>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No tasks yet. Add a sample task above!
                </p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => deleteItemByIdWithCloudSync(DataItemType.Tasks, task.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Cloud Sync Settings */}
      <LocalDataSettings />

      {/* Connection Status */}
      <div className="text-center text-sm text-muted-foreground">
        {state.isConnected ? (
          <p className="text-green-600">
            ✅ Connected to {state.provider === 'googledrive' ? 'Google Drive' : 'OneDrive'} - 
            Changes will be synchronized automatically
          </p>
        ) : (
          <p className="text-amber-600">
            ⚠️ Not connected to cloud storage - Changes are saved locally only
          </p>
        )}
      </div>
    </div>
  );
}