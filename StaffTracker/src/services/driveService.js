import * as SecureStore from 'expo-secure-store';
import { getAccessToken } from '../auth/authService';
import { 
  makeDirectoryAsync, 
  writeAsStringAsync, 
  readAsStringAsync, 
  deleteAsync, 
  getInfoAsync,
  documentDirectory 
} from 'expo-file-system/legacy';

const getDataFileName = (googleId) => {
  if (googleId) {
    return `staff_backup_${googleId}.json`;
  }
  return 'staff_backup.json';
};

const getDriveApiUrl = (endpoint) => {
  return `https://www.googleapis.com/drive/v3/${endpoint}`;
};

const getUploadUrl = (endpoint) => {
  return `https://www.googleapis.com/upload/drive/v3/${endpoint}`;
};

export const getFileIdByName = async (accessToken, googleId) => {
  if (!accessToken) {
    console.log('[DriveService] No accessToken provided');
    return null;
  }
  
  const fileName = getDataFileName(googleId);
  
  try {
    console.log('[DriveService] Searching for file:', fileName);
    const encodedName = encodeURIComponent(fileName);
    const url = new URL(getDriveApiUrl('files'));
    url.searchParams.set('q', `name='${fileName}' and trashed=false`);
    url.searchParams.set('fields', 'files(id, name, modifiedTime)');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (response.status === 401) {
      console.log('[DriveService] 401 Unauthorized - token expired');
      throw new Error('TOKEN_EXPIRED');
    }
    
    if (!response.ok) {
      console.log('[DriveService] Search API error, status:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.files && data.files.length > 0) {
      console.log('[DriveService] File found:', data.files[0].id);
      return data.files[0].id;
    }
    
    console.log('[DriveService] No existing file found');
    return null;
  } catch (error) {
    if (error.message === 'TOKEN_EXPIRED') {
      throw error;
    }
    console.log('[DriveService] getFileIdByName error:', error.message);
    return null;
  }
};

export const downloadJSON = async (accessToken, googleId) => {
  if (!accessToken) {
    console.log('[DriveService] No accessToken for download');
    return null;
  }
  
  const fileName = getDataFileName(googleId);
  
  let fileId;
  try {
    fileId = await getFileIdByName(accessToken, googleId);
  } catch (error) {
    if (error.message === 'TOKEN_EXPIRED') {
      throw error;
    }
    return null;
  }
  
  if (!fileId) {
    console.log('[DriveService] No file to download:', fileName);
    return null;
  }
  
  const url = new URL(getDriveApiUrl(`files/${fileId}`));
  url.searchParams.set('alt', 'media');
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (response.status === 401) {
    console.log('[DriveService] 401 Unauthorized during download');
    throw new Error('TOKEN_EXPIRED');
  }
  
  if (response.status === 204 || response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    console.log('[DriveService] Download error, status:', response.status);
    return null;
  }
  
  const content = await response.text();
  console.log('[DriveService] Downloaded content length:', content.length);
  return content;
};

export const uploadJSON = async (accessToken, jsonContent, googleId) => {
  if (!accessToken) {
    console.log('[DriveService] No accessToken for upload');
    return null;
  }
  
  const fileName = getDataFileName(googleId);
  console.log('[DriveService] Starting upload:', fileName);
  
  let fileId = null;
  try {
    fileId = await getFileIdByName(accessToken, googleId);
  } catch (error) {
    console.log('[DriveService] getFileIdByName error:', error.message);
  }
  
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };
  
  if (fileId) {
    console.log('[DriveService] Updating existing file:', fileId);
    try {
      const updateUrl = new URL(getUploadUrl(`files/${fileId}`));
      updateUrl.searchParams.set('uploadType', 'multipart');
      
      const boundary = '-------' + Date.now();
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelimiter = '\r\n--' + boundary + '--';
      
      const metadataPart = delimiter + 
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
        JSON.stringify(metadata);
      
      const contentPart = delimiter + 
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
        jsonContent + 
        closeDelimiter;
      
      const response = await fetch(updateUrl.toString(), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: metadataPart + contentPart,
      });
      
      if (response.status === 401) {
        console.log('[DriveService] 401 Unauthorized during update');
        throw new Error('TOKEN_EXPIRED');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('[DriveService] Update failed:', response.status, errorText);
        fileId = null;
      } else {
        console.log('[DriveService] File updated successfully');
        return await response.json();
      }
    } catch (updateError) {
      if (updateError.message === 'TOKEN_EXPIRED') {
        throw updateError;
      }
      console.log('[DriveService] Update error:', updateError.message);
      fileId = null;
    }
  }
  
  if (!fileId) {
    console.log('[DriveService] Creating new file...');
    const createUrl = new URL(getUploadUrl('files'));
    createUrl.searchParams.set('uploadType', 'multipart');
    
    const boundary = '-------' + Date.now();
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelimiter = '\r\n--' + boundary + '--';
    
    const metadataPart = delimiter + 
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
      JSON.stringify(metadata);
    
    const contentPart = delimiter + 
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
      jsonContent + 
      closeDelimiter;
    
    const response = await fetch(createUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: metadataPart + contentPart,
    });
    
    if (response.status === 401) {
      console.log('[DriveService] 401 Unauthorized during create');
      throw new Error('TOKEN_EXPIRED');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('[DriveService] Create failed:', response.status, errorText);
      throw new Error(`Failed to create file: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[DriveService] File created successfully:', result.id);
    return result;
  }
  
  return null;
};

export const deleteBackupFile = async (accessToken, googleId) => {
  if (!accessToken) {
    return true;
  }
  
  const fileName = getDataFileName(googleId);
  let fileId;
  try {
    fileId = await getFileIdByName(accessToken, googleId);
  } catch (error) {
    return true;
  }
  
  if (!fileId) {
    return true;
  }
  
  try {
    const response = await fetch(getDriveApiUrl(`files/${fileId}`), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    return response.ok || response.status === 404;
  } catch (error) {
    console.log('[DriveService] deleteBackupFile error:', error.message);
    return false;
  }
};

export const getBackupFileMetadata = async (accessToken, googleId) => {
  if (!accessToken) {
    return null;
  }
  
  const fileName = getDataFileName(googleId);
  
  let fileId;
  try {
    fileId = await getFileIdByName(accessToken, googleId);
  } catch (error) {
    return null;
  }
  
  if (!fileId) {
    return null;
  }
  
  try {
    const url = new URL(getDriveApiUrl(`files/${fileId}`));
    url.searchParams.set('fields', 'id, name, mimeType, createdTime, modifiedTime, size');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const saveToLocalCache = async (jsonContent, googleId) => {
  try {
    const cacheDir = documentDirectory + 'cache/';
    await makeDirectoryAsync(cacheDir, { intermediates: true });
    
    const fileName = getDataFileName(googleId);
    const filePath = cacheDir + fileName;
    await writeAsStringAsync(filePath, jsonContent);
    console.log('[DriveService] Cache saved:', fileName);
  } catch (error) {
    console.log('[DriveService] saveToLocalCache error:', error.message);
  }
};

export const loadFromLocalCache = async (googleId) => {
  try {
    const fileName = getDataFileName(googleId);
    const filePath = documentDirectory + 'cache/' + fileName;
    const info = await getInfoAsync(filePath);
    
    if (!info.exists) {
      return null;
    }
    
    return await readAsStringAsync(filePath);
  } catch (error) {
    return null;
  }
};

export const clearLocalCache = async () => {
  try {
    const cacheDir = documentDirectory + 'cache/';
    await deleteAsync(cacheDir, { idempotent: true });
  } catch (error) {
    console.log('Failed to clear cache:', error);
  }
};

export const getDataFileId = getFileIdByName;