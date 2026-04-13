import * as SecureStore from 'expo-secure-store';

const AUTH_STORAGE_KEY = 'stafftracker_auth';

const getStorage = () => {
  return {
    setItem: SecureStore.setItemAsync.bind(SecureStore),
    getItem: SecureStore.getItemAsync.bind(SecureStore),
    deleteItem: SecureStore.deleteItemAsync.bind(SecureStore),
  };
};

const storage = getStorage();

export const getStoredAuth = async () => {
  const authJson = await storage.getItem(AUTH_STORAGE_KEY);
  if (!authJson) return null;
  return JSON.parse(authJson);
};

export const logout = async () => {
  await storage.deleteItem(AUTH_STORAGE_KEY);
};

export const isAuthenticated = async () => {
  const auth = await getStoredAuth();
  return !!auth;
};

export const getUserData = async () => {
  const auth = await getStoredAuth();
  return auth?.user || null;
};

export const getAccessToken = async () => {
  const auth = await getStoredAuth();
  return auth?.accessToken || null;
};

export const saveAuth = async (authData) => {
  await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
};