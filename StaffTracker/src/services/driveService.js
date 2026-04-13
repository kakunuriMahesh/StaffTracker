import * as SecureStore from 'expo-secure-store';
import { getAccessToken } from '../auth/authService';
import * as FileSystem from 'expo-file-system';

const APP_DATA_FOLDER = 'appDataFolder';
const DATA_FILE_NAME = 'stafftracker_data.json';

const getDriveApiUrl = (endpoint) => {
  return `https://www.googleapis.com/drive/v3/${endpoint}`;
};

const getUploadUrl = (endpoint) => {
  return `https://www.googleapis.com/upload/drive/v3/${endpoint}`;
};

export const getAppDataFolderId = async (accessToken) => {
  const url = new URL(getDriveApiUrl('files'));
  url.searchParams.set('q', "name='appDataFolder' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  url.searchParams.set('spaces', 'appDataFolder');
  url.searchParams.set('fields', 'files(id, name)');
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get app data folder');
  }
  
  const data = await response.json();
  
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  
  return null;
};

export const createAppDataFolder = async (accessToken) => {
  const response = await fetch(getDriveApiUrl('files'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'appDataFolder',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create app data folder');
  }
  
  const data = await response.json();
  return data.id;
};

export const getDataFileId = async (accessToken) => {
  const url = new URL(getDriveApiUrl('files'));
  url.searchParams.set('q', `name='${DATA_FILE_NAME}' and trashed=false`);
  url.searchParams.set('spaces', 'appDataFolder');
  url.searchParams.set('fields', 'files(id, name, modifiedTime)');
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get data file');
  }
  
  const data = await response.json();
  
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  
  return null;
};

export const downloadJSON = async (accessToken) => {
  let fileId = await getDataFileId(accessToken);
  
  if (!fileId) {
    return null;
  }
  
  const url = new URL(getDriveApiUrl(`files/${fileId}`));
  url.searchParams.set('alt', 'media');
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (response.status === 204 || response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    throw new Error('Failed to download JSON');
  }
  
  const content = await response.text();
  return content;
};

export const uploadJSON = async (accessToken, jsonContent) => {
  let fileId = await getDataFileId(accessToken);
  
  const metadata = {
    name: DATA_FILE_NAME,
    mimeType: 'application/json',
    parents: [APP_DATA_FOLDER],
  };
  
  if (fileId) {
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
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update JSON: ${error}`);
    }
    
    return await response.json();
  } else {
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
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create JSON: ${error}`);
    }
    
    return await response.json();
  }
};

export const deleteDataFile = async (accessToken) => {
  let fileId = await getDataFileId(accessToken);
  
  if (!fileId) {
    return true;
  }
  
  const response = await fetch(getDriveApiUrl(`files/${fileId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  return response.ok || response.status === 404;
};

export const getFileMetadata = async (accessToken) => {
  let fileId = await getDataFileId(accessToken);
  
  if (!fileId) {
    return null;
  }
  
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
};

export const saveToLocalCache = async (jsonContent) => {
  const cacheDir = FileSystem.documentDirectory + 'cache/';
  await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
  
  const filePath = cacheDir + DATA_FILE_NAME;
  await FileSystem.writeAsStringAsync(filePath, jsonContent);
};

export const loadFromLocalCache = async () => {
  try {
    const filePath = FileSystem.documentDirectory + 'cache/' + DATA_FILE_NAME;
    const info = await FileSystem.getInfoAsync(filePath);
    
    if (!info.exists) {
      return null;
    }
    
    return await FileSystem.readAsStringAsync(filePath);
  } catch (error) {
    return null;
  }
};

export const clearLocalCache = async () => {
  try {
    const cacheDir = FileSystem.documentDirectory + 'cache/';
    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
  } catch (error) {
    console.log('Failed to clear cache:', error);
  }
};