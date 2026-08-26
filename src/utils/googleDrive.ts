// Google Drive OAuth and File Upload Helper for Client-Side integration

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface DriveUserProfile {
  email?: string;
  name?: string;
  picture?: string;
}

export interface DriveAuthUser {
  token: string;
  expiresAt: number;
  profile?: DriveUserProfile;
}

export interface UploadProgressCallback {
  (progress: number, statusText: string): void;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
}

const TOKEN_STORAGE_KEY = 'studio_gdrive_auth_token';

export function getStoredDriveAuth(): DriveAuthUser | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DriveAuthUser;
    if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed reading drive auth from storage', e);
  }
  return null;
}

export function getStoredDriveToken(): string | null {
  const auth = getStoredDriveAuth();
  return auth ? auth.token : null;
}

export function saveDriveToken(token: string, expiresInSeconds: number = 3500, profile?: DriveUserProfile): void {
  try {
    const data: DriveAuthUser = {
      token,
      expiresAt: Date.now() + (expiresInSeconds - 60) * 1000,
      profile,
    };
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed saving drive token to storage', e);
  }
}

export function clearDriveToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function fetchDriveUserProfile(token: string): Promise<DriveUserProfile | undefined> {
  try {
    const res = await fetch(USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        email: data.email,
        name: data.name,
        picture: data.picture,
      };
    }
  } catch (e) {
    console.warn('Could not fetch user profile info', e);
  }
  return undefined;
}

// Connect or request Google OAuth token via Google Identity Services
export async function connectGoogleDriveAccount(forceConsent: boolean = false): Promise<DriveAuthUser> {
  return new Promise((resolve, reject) => {
    // Check if google scripts are available
    const win = window as any;
    if (!win.google || !win.google.accounts || !win.google.accounts.oauth2) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initiateTokenRequest(resolve, reject, forceConsent);
      };
      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services library. Please check your internet connection.'));
      };
      document.head.appendChild(script);
    } else {
      initiateTokenRequest(resolve, reject, forceConsent);
    }
  });
}

// Request Google OAuth token via Google Identity Services
export async function requestDriveAccessToken(): Promise<string> {
  const existing = getStoredDriveToken();
  if (existing) {
    return existing;
  }
  const auth = await connectGoogleDriveAccount(false);
  return auth.token;
}

function initiateTokenRequest(
  resolve: (auth: DriveAuthUser) => void,
  reject: (reason?: any) => void,
  forceConsent: boolean = false
) {
  const win = window as any;
  try {
    const tokenClient = win.google.accounts.oauth2.initTokenClient({
      client_id: '131042029675-oauth-client.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (tokenResponse: any) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error));
          return;
        }
        if (tokenResponse.access_token) {
          const expiresIn = parseInt(tokenResponse.expires_in, 10) || 3600;
          const profile = await fetchDriveUserProfile(tokenResponse.access_token);
          saveDriveToken(tokenResponse.access_token, expiresIn, profile);
          resolve({
            token: tokenResponse.access_token,
            expiresAt: Date.now() + (expiresIn - 60) * 1000,
            profile,
          });
        } else {
          reject(new Error('No access token received from Google.'));
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: forceConsent ? 'select_account consent' : 'consent' });
  } catch (err) {
    console.error('OAuth token client init error', err);
    reject(err);
  }
}

/**
 * Uploads a file directly to Google Drive via multipart upload
 * and makes it accessible for showcase preview.
 */
export async function uploadFileToGoogleDrive(
  file: File,
  token: string,
  onProgress?: UploadProgressCallback
): Promise<DriveUploadResult> {
  if (onProgress) onProgress(10, 'Preparing file for upload...');

  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    description: 'Uploaded via Studio Portfolio Hub',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();

  const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed reading file data'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

  const fileData = await fileDataPromise;
  if (onProgress) onProgress(35, 'Sending to Google Drive...');

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const mediaHeader = `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

  // Convert binary to base64
  let binary = '';
  const bytes = new Uint8Array(fileData);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const multipartRequestBody = metadataPart + mediaHeader + base64Data + closeDelimiter;

  const uploadRes = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!uploadRes.ok) {
    const errJson = await uploadRes.json().catch(() => ({}));
    throw new Error(
      errJson.error?.message || `Google Drive upload failed with status ${uploadRes.status}`
    );
  }

  const uploadedData = await uploadRes.json();
  const fileId = uploadedData.id;

  if (onProgress) onProgress(75, 'Configuring file sharing permissions...');

  // Set file permissions so anyone with the link can view it in the showcase
  try {
    await fetch(`${DRIVE_FILES_URL}/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (permErr) {
    console.warn('Could not set public view permission on drive file', permErr);
  }

  if (onProgress) onProgress(90, 'Fetching high-resolution asset links...');

  // Fetch complete file details (webViewLink, thumbnailLink, etc.)
  const fileDetailsRes = await fetch(
    `${DRIVE_FILES_URL}/${fileId}?fields=id,name,webViewLink,webContentLink,thumbnailLink`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  let webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  let webContentLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
  let thumbnailLink: string | undefined = undefined;

  if (fileDetailsRes.ok) {
    const details = await fileDetailsRes.json();
    if (details.webViewLink) webViewLink = details.webViewLink;
    if (details.webContentLink) webContentLink = details.webContentLink;
    if (details.thumbnailLink) thumbnailLink = details.thumbnailLink;
  }

  if (onProgress) onProgress(100, 'Upload complete!');

  return {
    fileId,
    fileName: file.name,
    webViewLink,
    webContentLink,
    thumbnailLink,
  };
}
