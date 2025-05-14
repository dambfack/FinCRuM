
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification, Contact } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getData, saveData, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const NotificationBell: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const loadNotifications = useCallback(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    const allNotifications = getData<Notification[]>(DataItemType.Notifications) || [];
    const userNotifications = allNotifications
      .filter(n => n.recipientUserId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setNotifications(userNotifications);
    setUnreadCount(userNotifications.filter(n => !n.read).length);
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();
    // Optional: set up an interval to refresh notifications periodically
    // const intervalId = setInterval(loadNotifications, 30000); // every 30 seconds
    // return () => clearInterval(intervalId);
  }, [loadNotifications]);
  
  const markAsRead = (notificationId: string) => {
    const allNotifications = getData<Notification[]>(DataItemType.Notifications) || [];
    const updatedNotifications = allNotifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveData<Notification[]>(DataItemType.Notifications, updatedNotifications);
    loadNotifications(); // Refresh the list
  };

  const markAllAsRead = () => {
    if (!currentUser) return;
    const allNotifications = getData<Notification[]>(DataItemType.Notifications) || [];
    const updatedNotifications = allNotifications.map(n =>
      n.recipientUserId === currentUser.id ? { ...n, read: true } : n
    );
    saveData<Notification[]>(DataItemType.Notifications, updatedNotifications);
    loadNotifications();
  };

  const handleApprovalAction = (notification: Notification, action: 'approve' | 'reject') => {
    if (!currentUser || currentUser.role !== 'partner' || notification.type !== 'approval_request' || !notification.relatedItemId || !notification.relatedItemType) {
      toast({ title: "Error", description: "Invalid action or insufficient permissions.", variant: "destructive" });
      return;
    }

    const itemType = notification.relatedItemType;
    const itemId = notification.relatedItemId;

    if (itemType === DataItemType.Contacts) {
      let contacts = getData<Contact[]>(DataItemType.Contacts) || [];
      const contactIndex = contacts.findIndex(c => c.id === itemId);

      if (contactIndex === -1) {
        toast({ title: "Error", description: "Related contact not found.", variant: "destructive" });
        return;
      }
      const originalContact = contacts[contactIndex];

      if (action === 'approve') {
        if (originalContact.contactStatus === 'pending_approval' && originalContact.changeProposal) {
          contacts[contactIndex] = {
            ...originalContact,
            ...originalContact.changeProposal, // Apply proposed changes
            contactStatus: 'approved',
            changeProposal: undefined, // Clear proposal
            updatedAt: new Date().toISOString(),
            lastModifiedByRole: 'partner', // Partner approved
          };
          toast({ title: "Contact Approved", description: `Changes for ${originalContact.firstName} ${originalContact.lastName} approved.` });
        } else if (originalContact.contactStatus === 'pending_deletion') {
          contacts.splice(contactIndex, 1); // Delete the contact
          toast({ title: "Contact Deletion Approved", description: `${originalContact.firstName} ${originalContact.lastName} deleted.` });
        }
      } else if (action === 'reject') {
        if (originalContact.contactStatus === 'pending_approval') {
          contacts[contactIndex] = {
            ...originalContact,
            contactStatus: 'approved', // Revert to approved (changes rejected)
            changeProposal: undefined,
            updatedAt: new Date().toISOString(),
            lastModifiedByRole: 'partner',
          };
          toast({ title: "Contact Changes Rejected", description: `Proposed changes for ${originalContact.firstName} ${originalContact.lastName} rejected.` });
        } else if (originalContact.contactStatus === 'pending_deletion') {
          contacts[contactIndex] = {
            ...originalContact,
            contactStatus: 'approved', // Revert to approved (deletion rejected)
            updatedAt: new Date().toISOString(),
            lastModifiedByRole: 'partner',
          };
           toast({ title: "Contact Deletion Rejected", description: `Deletion request for ${originalContact.firstName} ${originalContact.lastName} rejected.` });
        }
      }
      saveData<Contact[]>(DataItemType.Contacts, contacts);
    }
    // Extend for other DataItemTypes (Tasks, etc.) if approval flows are added for them

    markAsRead(notification.id);
    loadNotifications(); // Refresh notifications and potentially other data if needed
  };


  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assignment':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'approval_request':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'info':
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={(open) => {
      setIsPopoverOpen(open);
      if (open) loadNotifications(); // Refresh when opened
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-md"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] p-0.5 text-xs flex items-center justify-center rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0 glass-effect bg-popover/80 dark:bg-popover/60 border-white/10 dark:border-white/5">
        <div className="p-4 border-b border-border/20">
          <h4 className="font-medium text-sm font-heading tracking-wide">Notifications</h4>
        </div>
        <ScrollArea className="h-[300px] sm:h-[400px]">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No new notifications.</p>
          ) : (
            <div className="divide-y divide-border/10">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 space-y-1",
                    !notification.read && "bg-primary/5 dark:bg-primary/10"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{getNotificationIcon(notification.type)}</span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/70 pl-6">
                    {formatDateTime(notification.createdAt)}
                  </p>
                  {!notification.read && (
                     <Button
                        variant="link"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-auto p-0 text-xs text-accent hover:text-accent/80 ml-6"
                      >
                        Mark as Read
                      </Button>
                  )}
                  {currentUser?.role === 'partner' && notification.type === 'approval_request' && !notification.read && (
                    <div className="flex gap-2 mt-1 pl-6">
                      <Button size="xs" variant="default" onClick={() => handleApprovalAction(notification, 'approve')} className="h-7 px-2 py-1 text-xs">
                        Approve
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => handleApprovalAction(notification, 'reject')} className="h-7 px-2 py-1 text-xs">
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && unreadCount > 0 && (
            <div className="p-2 border-t border-border/20 flex justify-end">
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                    Mark All as Read
                </Button>
            </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
