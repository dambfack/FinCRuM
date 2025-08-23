/**
 * Encryption utilities for secure cross-device user account synchronization
 * Provides AES-256-GCM encryption with PBKDF2 key derivation
 */

import { CloudAuthInfo } from '../lib/types';

export interface EncryptionKey {
  key: CryptoKey;
  salt: Uint8Array;
  iv: Uint8Array;
}

export interface EncryptedData {
  encryptedData: string; // Base64 encoded
  salt: string; // Base64 encoded
  iv: string; // Base64 encoded
  algorithm: string;
  keyDerivation: string;
}

export interface DeviceFingerprint {
  deviceId: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  timestamp: string;
}

/**
 * Generate a device fingerprint for device identification
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  return {
    deviceId: crypto.randomUUID(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '1920x1080',
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
    language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
    timestamp: new Date().toISOString()
  };
}

/**
 * Derive encryption key from cloud authentication info and device fingerprint
 */
export async function deriveEncryptionKey(
  cloudAuth: CloudAuthInfo,
  deviceFingerprint: DeviceFingerprint,
  salt?: Uint8Array
): Promise<EncryptionKey> {
  // Create key material from cloud auth token and device info
  const keyMaterial = `${cloudAuth.accessToken}:${deviceFingerprint.deviceId}:${cloudAuth.provider}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);
  
  // Generate or use provided salt
  const keySalt = salt || crypto.getRandomValues(new Uint8Array(32));
  
  // Import key material
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-GCM key
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: keySalt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    importedKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Generate IV for encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  return {
    key: derivedKey,
    salt: keySalt,
    iv
  };
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export async function encryptData(
  data: string,
  encryptionKey: EncryptionKey
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: encryptionKey.iv
    },
    encryptionKey.key,
    dataBuffer
  );
  
  return {
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    salt: arrayBufferToBase64(encryptionKey.salt.buffer as ArrayBuffer),
    iv: arrayBufferToBase64(encryptionKey.iv.buffer as ArrayBuffer),
    algorithm: 'AES-GCM',
    keyDerivation: 'PBKDF2'
  };
}

/**
 * Decrypt sensitive data using AES-256-GCM
 */
export async function decryptData(
  encryptedData: EncryptedData,
  cloudAuth: CloudAuthInfo,
  deviceFingerprint: DeviceFingerprint
): Promise<string> {
  // Recreate encryption key
  const salt = base64ToArrayBuffer(encryptedData.salt);
  const iv = base64ToArrayBuffer(encryptedData.iv);
  
  const encryptionKey = await deriveEncryptionKey(
    cloudAuth,
    deviceFingerprint,
    new Uint8Array(salt)
  );
  
  // Update IV to match encrypted data
  encryptionKey.iv = new Uint8Array(iv);
  
  const encryptedBuffer = base64ToArrayBuffer(encryptedData.encryptedData);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: encryptionKey.iv
    },
    encryptionKey.key,
    encryptedBuffer
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Encrypt user password with additional security measures
 */
export async function encryptPassword(
  password: string,
  cloudAuth: CloudAuthInfo,
  deviceFingerprint: DeviceFingerprint
): Promise<EncryptedData> {
  // Add timestamp and device info to password for additional security
  const securePassword = JSON.stringify({
    password,
    timestamp: new Date().toISOString(),
    deviceId: deviceFingerprint.deviceId
  });
  
  const encryptionKey = await deriveEncryptionKey(cloudAuth, deviceFingerprint);
  return encryptData(securePassword, encryptionKey);
}

/**
 * Decrypt user password and validate security measures
 */
export async function decryptPassword(
  encryptedPassword: EncryptedData,
  cloudAuth: CloudAuthInfo,
  deviceFingerprint: DeviceFingerprint
): Promise<string> {
  const decryptedData = await decryptData(encryptedPassword, cloudAuth, deviceFingerprint);
  const passwordData = JSON.parse(decryptedData);
  
  // Validate timestamp (password should not be older than 30 days)
  const passwordAge = Date.now() - new Date(passwordData.timestamp).getTime();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  
  if (passwordAge > maxAge) {
    throw new Error('Encrypted password has expired and needs to be re-encrypted');
  }
  
  return passwordData.password;
}

/**
 * Utility function to convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Utility function to convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a secure device registration token
 */
export async function generateDeviceRegistrationToken(
  cloudAuth: CloudAuthInfo,
  deviceFingerprint: DeviceFingerprint
): Promise<string> {
  const registrationData = {
    cloudProvider: cloudAuth.provider,
    deviceFingerprint,
    timestamp: new Date().toISOString(),
    nonce: crypto.randomUUID()
  };
  
  const encryptionKey = await deriveEncryptionKey(cloudAuth, deviceFingerprint);
  const encrypted = await encryptData(JSON.stringify(registrationData), encryptionKey);
  
  return JSON.stringify(encrypted);
}

/**
 * Validate device registration token
 */
export async function validateDeviceRegistrationToken(
  token: string,
  cloudAuth: CloudAuthInfo,
  deviceFingerprint: DeviceFingerprint
): Promise<boolean> {
  try {
    const encryptedData: EncryptedData = JSON.parse(token);
    const decryptedData = await decryptData(encryptedData, cloudAuth, deviceFingerprint);
    const registrationData = JSON.parse(decryptedData);
    
    // Validate token age (should not be older than 1 hour)
    const tokenAge = Date.now() - new Date(registrationData.timestamp).getTime();
    const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
    
    return tokenAge <= maxAge && registrationData.cloudProvider === cloudAuth.provider;
  } catch (error) {
    console.error('Device registration token validation failed:', error);
    return false;
  }
}