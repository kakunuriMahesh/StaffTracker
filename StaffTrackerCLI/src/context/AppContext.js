import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [plan, setPlan] = useState({ type: 'Free', status: 'Active', expiryDate: null });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isPlanActive = () => plan.status === 'Active';
  const isPremium = () => plan.type === 'Premium';
  const getMaxStaffCount = () => (isPremium() ? Infinity : 5);

  const isStaffLocked = (staff) => {
    if (isPlanActive() || isPremium()) return false;
    return staff.isLocked || false;
  };

  const canEditStaff = (staff) => {
    if (!isPlanActive() && !isPremium()) return staff.isLocked === false;
    return true;
  };

  const canMarkAttendance = (staff) => {
    if (!isPlanActive() && !isPremium()) return staff.isLocked === false;
    return true;
  };

  const loadData = async () => {
    setLoading(true);
    const [staff, attend, planData] = await Promise.all([
      storageService.getStaffList(),
      storageService.getAttendance(),
      storageService.getPlan(),
    ]);
    setStaffList(staff);
    setAttendance(attend);
    setPlan(planData);
    setLoading(false);
  };

  const addStaff = async (staff) => {
    const newStaff = {
      ...staff,
      id: Date.now().toString(),
      joinedDate: new Date().toISOString(),
      isActive: true,
      isLocked: false,
    };
    
    let updatedList = [...staffList, newStaff];
    
    if (!isPremium() && updatedList.length > 5) {
      updatedList = updatedList.sort((a, b) => 
        new Date(a.joinedDate) - new Date(b.joinedDate)
      );
      updatedList = updatedList.map((s, i) => ({
        ...s,
        isLocked: i >= 5,
      }));
    }
    
    setStaffList(updatedList);
    await storageService.saveStaffList(updatedList);
  };

  const updateStaff = async (id, updates) => {
    const updatedList = staffList.map(s => 
      s.id === id ? { ...s, ...updates } : s
    );
    setStaffList(updatedList);
    await storageService.saveStaffList(updatedList);
  };

  const deleteStaff = async (id) => {
    const updatedList = staffList.filter(s => s.id !== id);
    setStaffList(updatedList);
    await storageService.saveStaffList(updatedList);
  };

  const markAttendance = async (staffId, date, status) => {
    const key = `${staffId}_${date}`;
    const updated = { ...attendance, [key]: status };
    setAttendance(updated);
    await storageService.saveAttendance(updated);
  };

  const getAttendance = (staffId, date) => {
    const key = `${staffId}_${date}`;
    return attendance[key] || null;
  };

  const setPlanType = async (type) => {
    const updatedPlan = { ...plan, type };
    setPlan(updatedPlan);
    await storageService.savePlan(updatedPlan);
    
    if (type === 'Free') {
      const locked = staffList.map(s => ({ ...s, isLocked: false }));
      setStaffList(locked);
      await storageService.saveStaffList(locked);
    }
  };

  const setPlanStatus = async (status) => {
    const updatedPlan = { ...plan, status };
    setPlan(updatedPlan);
    await storageService.savePlan(updatedPlan);
    
    if (status === 'Expired' && !isPremium()) {
      const sorted = [...staffList].sort((a, b) => 
        new Date(a.joinedDate) - new Date(b.joinedDate)
      );
      const locked = sorted.map((s, i) => ({
        ...s,
        isLocked: i >= 5,
      }));
      setStaffList(locked);
      await storageService.saveStaffList(locked);
    } else if (status === 'Active') {
      const unlocked = staffList.map(s => ({ ...s, isLocked: false }));
      setStaffList(unlocked);
      await storageService.saveStaffList(unlocked);
    }
  };

  const login = (mockUser) => setUser(mockUser);
  const logout = () => setUser(null);

  useEffect(() => {
    loadData();
  }, []);

  const value = {
    user,
    staffList,
    attendance,
    plan,
    loading,
    isPlanActive,
    isPremium,
    getMaxStaffCount,
    isStaffLocked,
    canEditStaff,
    canMarkAttendance,
    addStaff,
    updateStaff,
    deleteStaff,
    markAttendance,
    getAttendance,
    setPlanType,
    setPlanStatus,
    login,
    logout,
    reloadData: loadData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};