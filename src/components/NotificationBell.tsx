
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, AlertTriangle, EyeOff, History } from 'lucide-react';
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
    // toast({ title: "Notification Dismissed" }); // Toasting on dismiss might be too noisy
  };

  const markAllAsRead = () => {
    if (!currentUser || unreadCount === 0) return;
    const allNotifications = getData<Notification[]>(DataItemType.Notifications) || [];
    const updatedNotifications = allNotifications.map(n =>
      (n.recipientUserId === currentUser.id && !n.read) ? { ...n, read: true } : n
    );
    saveData<Notification[]>(DataItemType.Notifications, updatedNotifications);
    loadNotifications();
    toast({ title: "All Unread Notifications Cleared" });
  };

  const handleApprovalAction = (notification: Notification, action: 'approve' | 'reject') => {
    if (!currentUser || currentUser.role !== 'partner' || notification.type !== 'approval_request' || !notification.relatedItemId || !notification.relatedItemType) {
      toast({ title: "Error", description: "Invalid action or insufficient permissions.", variant: "destructive" });
      return;
    }

    const itemType = notification.relatedItemType;
    const itemId = notification.relatedItemId;
    let itemUpdated = false;

    if (itemType === DataItemType.Contacts) {
      let contacts = getData<Contact[]>(DataItemType.Contacts) || [];
      const contactIndex = contacts.findIndex(c => c.id === itemId);

      if (contactIndex === -1) {
        toast({ title: "Error", description: "Related contact not found.", variant: "destructive" });
        markAsRead(notification.id); 
        return;
      }
      const originalContact = contacts[contactIndex];
      let contactName = `${originalContact.firstName || (originalContact.changeProposal?.firstName)} ${originalContact.lastName || (originalContact.changeProposal?.lastName)}`;
      if (!contactName.trim() && originalContact.changeProposal) {
        contactName = `${originalContact.changeProposal.firstName} ${originalContact.changeProposal.lastName}`;
      }
      contactName = contactName.trim() || "Unnamed Contact";


      if (action === 'approve') {
        if (originalContact.contactStatus === 'pending_approval' && originalContact.changeProposal) {
          contacts[contactIndex] = {
            ...originalContact, 
            ...originalContact.changeProposal, 
            id: originalContact.id, 
            createdAt: originalContact.createdAt, 
            contactStatus: 'approved',
            changeProposal: undefined, 
            updatedAt: new Date().toISOString(),
            lastModifiedByRole: 'partner', 
          };
          toast({ title: "Contact Approved", description: `Changes for ${contactName} approved.` });
          itemUpdated = true;
        } else if (originalContact.contactStatus === 'pending_deletion') {
          contacts.splice(contactIndex, 1); 
          toast({ title: "Contact Deletion Approved", description: `${contactName} deleted.` });
          itemUpdated = true;
        }
      } else if (action === 'reject') {
        if (originalContact.contactStatus === 'pending_approval') {
          contacts[contactIndex] = {
            ...originalContact,
            contactStatus: 'approved', 
            changeProposal: undefined,
            updatedAt: new Date().toISOString(),
            lastModifiedByRole: 'partner',
          };
          toast({ title: "Contact Changes Rejected", description: `Proposed changes for ${contactName} rejected.` });
          itemUpdated = true;
        } else if (originalContact.contactStatus === 'pending_deletion') {
          contacts[contactIndex] = {
            ...originalContact,
            contactStatus: 'approved', 
            updatedAt: new Date().toISOString(),
            lastModifiedByRole: 'partner',
          };
           toast({ title: "Contact Deletion Rejected", description: `Deletion request for ${contactName} rejected.` });
           itemUpdated = true;
        }
      }
      if (itemUpdated) {
        saveData<Contact[]>(DataItemType.Contacts, contacts);
      }
    }
    // Future: Add similar logic for other DataItemTypes if they have approval flows

    markAsRead(notification.id); 
    loadNotifications(); 
    if (itemUpdated && itemType === DataItemType.Contacts) {
      window.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: DataItemType.Contacts } }));
    }
  };


  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assignment':
        return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case 'approval_request':
        return <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />;
      case 'info':
      default:
        return <Bell className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    }
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={(open) => {
      setIsPopoverOpen(open);
      if (open) loadNotifications(); 
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
        <div className="p-4 border-b border-border/20 flex justify-between items-center">
          <h4 className="font-medium text-sm font-heading tracking-wide">Notifications</h4>
           {notifications.length > 0 && unreadCount > 0 && (
             <Button variant="link" size="sm" onClick={markAllAsRead} className="h-auto p-0 text-xs flex items-center gap-1 text-accent hover:text-accent/80">
                <History className="h-3 w-3" /> Clear All Unread
             </Button>
           )}
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
                    "p-3 space-y-1 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors",
                    !notification.read && "bg-primary/10 dark:bg-primary/20" 
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <p className={cn("text-sm leading-tight", !notification.read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                  <div className="pl-6 flex justify-between items-center">
                    <p className="text-xs text-muted-foreground/70">
                        {formatDateTime(notification.createdAt)}
                    </p>
                    {!notification.read && notification.type !== 'approval_request' && (
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => markAsRead(notification.id)}
                            className="h-auto p-1 text-xs text-accent hover:text-accent-foreground hover:bg-accent/20 flex items-center gap-1"
                            title="Dismiss notification"
                        >
                            <EyeOff className="h-3 w-3" />
                            Dismiss
                        </Button>
                    )}
                  </div>
                  {currentUser?.role === 'partner' && notification.type === 'approval_request' && !notification.read && (
                    <div className="flex gap-2 mt-1.5 pl-6">
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
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
    
    
    