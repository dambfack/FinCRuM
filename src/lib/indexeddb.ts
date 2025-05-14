// src/lib/indexeddb.ts

const DB_NAME = 'FinsculptCRMDB';
const DB_VERSION = 1;
const FILE_STORE_NAME = 'fileAttachments';

interface IDBRequestErrorEvent extends Event {
  target: IDBRequest & EventTarget;
}

interface IDBTransactionErrorEvent extends Event {
  target: IDBTransaction & EventTarget;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB can only be used in the browser.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.createObjectStore(FILE_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      dbPromise = null; // Reset promise on error
      reject(new Error(`IndexedDB error: ${(event.target as IDBOpenDBRequest).error?.message}`));
    };
  });
  return dbPromise;
}

export async function storeFile(attachmentId: string, fileContent: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FILE_STORE_NAME);
    const request = store.put({ id: attachmentId, content: fileContent });

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Error storing file in IndexedDB:', (event.target as IDBRequest).error);
      reject(new Error(`Failed to store file: ${(event.target as IDBRequest).error?.message}`));
    };
    transaction.onerror = (event) => {
      console.error('Transaction error storing file:', (event.target as IDBTransaction).error);
      reject(new Error(`Transaction failed to store file: ${(event.target as IDBTransaction).error?.message}`));
    };
  });
}

export async function getFile(attachmentId: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(FILE_STORE_NAME);
    const request = store.get(attachmentId);

    request.onsuccess = () => {
      resolve(request.result ? request.result.content : null);
    };
    request.onerror = (event) => {
      console.error('Error retrieving file from IndexedDB:', (event.target as IDBRequest).error);
      reject(new Error(`Failed to retrieve file: ${(event.target as IDBRequest).error?.message}`));
    };
     transaction.onerror = (event) => {
      console.error('Transaction error retrieving file:', (event.target as IDBTransaction).error);
      reject(new Error(`Transaction failed to retrieve file: ${(event.target as IDBTransaction).error?.message}`));
    };
  });
}

export async function deleteFile(attachmentId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FILE_STORE_NAME);
    const request = store.delete(attachmentId);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Error deleting file from IndexedDB:', (event.target as IDBRequest).error);
      reject(new Error(`Failed to delete file: ${(event.target as IDBRequest).error?.message}`));
    };
    transaction.onerror = (event) => {
      console.error('Transaction error deleting file:', (event.target as IDBTransaction).error);
      reject(new Error(`Transaction failed to delete file: ${(event.target as IDBTransaction).error?.message}`));
    };
  });
}
