import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppConfig } from '../types';
import { parseAndValidateImportJSON } from './storageService';

// Initialize Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface DriveFileMetadata {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

export const DRIVE_CONFIG_FILE_NAME = 'quickkeys_config.json';

/**
 * Find existing quickkeys_config.json file in user's Drive
 */
export async function findDriveConfigFile(token: string): Promise<DriveFileMetadata | null> {
  const query = encodeURIComponent(`name = '${DRIVE_CONFIG_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,webViewLink)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to query Google Drive: ${response.statusText} (${errText})`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Save / upload current app config to Google Drive
 */
export async function saveConfigToDrive(
  token: string,
  config: AppConfig
): Promise<DriveFileMetadata> {
  const existingFile = await findDriveConfigFile(token);

  const fileData = {
    ...config,
    lastSyncedAt: new Date().toISOString(),
    syncSource: 'QuickKeys AI Windows Studio',
  };

  const jsonString = JSON.stringify(fileData, null, 2);

  if (existingFile) {
    // Update existing file via PATCH
    const url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: jsonString,
    });

    if (!response.ok) {
      throw new Error(`Failed to update Google Drive file: ${response.statusText}`);
    }

    // Get updated metadata
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?fields=id,name,modifiedTime,size,webViewLink`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await metaRes.json();
  } else {
    // Create new file via Multipart POST
    const metadata = {
      name: DRIVE_CONFIG_FILE_NAME,
      mimeType: 'application/json',
      description: 'QuickKeys AI Application Workflows & Provider Configuration',
    };

    const boundary = 'quickkeys_drive_boundary_' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonString +
      closeDelimiter;

    const url =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,webViewLink';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to create Google Drive file: ${err}`);
    }

    return await response.json();
  }
}

/**
 * Fetch and parse config from Google Drive
 */
export async function loadConfigFromDrive(
  token: string
): Promise<{ config: AppConfig; metadata: DriveFileMetadata }> {
  const existingFile = await findDriveConfigFile(token);
  if (!existingFile) {
    throw new Error(`No '${DRIVE_CONFIG_FILE_NAME}' backup found in your Google Drive.`);
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download configuration from Drive: ${response.statusText}`);
  }

  const jsonText = await response.text();
  const parsedConfig = parseAndValidateImportJSON(jsonText);

  return { config: parsedConfig, metadata: existingFile };
}

/**
 * Save a single automation workflow as an individual file in Google Drive
 */
export async function saveSingleAutomationToDrive(
  token: string,
  workflow: any
): Promise<DriveFileMetadata> {
  const fileName = `automation_${workflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`;
  
  // Search if workflow file already exists
  const query = encodeURIComponent(`name = '${fileName}' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let existingFileId: string | null = null;
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      existingFileId = searchData.files[0].id;
    }
  }

  const fileData = {
    ...workflow,
    lastBackedUpAt: new Date().toISOString(),
    syncType: 'quickkeys_single_automation_backup',
  };

  const jsonString = JSON.stringify(fileData, null, 2);

  if (existingFileId) {
    const url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: jsonString,
    });

    if (!response.ok) {
      throw new Error(`Failed to update automation in Google Drive: ${response.statusText}`);
    }

    const metaUrl = `https://www.googleapis.com/drive/v3/files/${existingFileId}?fields=id,name,modifiedTime,size,webViewLink`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await metaRes.json();
  } else {
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      description: `QuickKeys AI Automation Workflow: ${workflow.name}`,
    };

    const boundary = 'quickkeys_auto_boundary_' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonString +
      closeDelimiter;

    const url =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,webViewLink';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to upload automation to Google Drive: ${err}`);
    }

    return await response.json();
  }
}
