// src/hooks/use-local-database.tsx
import { useCallback, useState } from 'react';
import { Contact, DataItemType } from '@/lib/types'; // Assuming Contact type is defined here, Added DataItemType

const DB_NAME = 'FinCRuMDB';
const CUSTOMERS_STORE_NAME = 'customers';

interface LocalDBHook {
  getAllContacts: () => Promise<Contact[]>;
  // Add other CRUD operations as needed
  // getContactById: (id: string) => Promise<Contact | undefined>;
  // addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  // updateContact: (contact: Contact) => Promise<Contact>;
  // deleteContact: (id: string) => Promise<void>;
}

export const useLocalDatabase = (): LocalDBHook => {
  const getAllContacts = useCallback(async (): Promise<Contact[]> => {
    return new Promise((resolve, reject) => {
        try {
          const storedData = localStorage.getItem(DataItemType.Contacts);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (Array.isArray(parsedData)) {
            resolve(parsedData as Contact[]);
          } else if (parsedData && Array.isArray(parsedData.rows)) {
            // Handle cases where data might be nested under a 'rows' property
            resolve(parsedData.rows as Contact[]);
          } else {
            console.warn('Stored customer data (key: DataItemType.Contacts) is not in a recognized array format.');
            resolve([]);
          }
        } else {
          resolve([]); // No data found, return empty array
        }
      } catch (error) {
        console.error('Error fetching contacts from localStorage:', error);
        reject(error);
      }
    });
  }, []);

  // Placeholder for other functions if you expand the hook
  // const getContactById = useCallback(async (id: string): Promise<Contact | undefined> => { ... }, []);
  // const addContact = useCallback(async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> => { ... }, []);
  // const updateContact = useCallback(async (contact: Contact): Promise<Contact> => { ... }, []);
  // const deleteContact = useCallback(async (id: string): Promise<void> => { ... }, []);

  return {
    getAllContacts,
    // getContactById,
    // addContact,
    // updateContact,
    // deleteContact,
  };
};