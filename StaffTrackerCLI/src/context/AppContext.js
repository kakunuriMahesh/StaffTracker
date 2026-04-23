import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [notes, setNotes] = useState({});
  const [plan, setPlan] = useState({ type: 'Free', status: 'Active', expiryDate: null });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getActiveStaffList = () => staffList.filter(s => !s.is_deleted && !s.is_archived);
  const getArchivedStaffList = () => staffList.filter(s => s.is_archived && !s.is_deleted);

  const isPlanActive = () => plan.status === 'Active';
  const isPremium = () => plan.type === 'Premium';
  const getMaxStaffCount = () => (plan.type === 'Monthly' ? 50 : plan.type === 'Premium' ? Infinity : 5);

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
    const [staff, attend, planData, staffNotes] = await Promise.all([
      storageService.getStaffList(),
      storageService.getAttendance(),
      storageService.getPlan(),
      storageService.getNotes(),
    ]);
    setStaffList(staff);
    setAttendance(attend);
    setNotes(staffNotes || {});
    setPlan(planData);
    setLoading(false);
  };

  const addStaff = async (staff) => {
    const activeStaff = getActiveStaffList();
    const maxCount = getMaxStaffCount();
    
    if (!isPremium() && activeStaff.length >= maxCount) {
      return { error: 'limit_reached' };
    }
    
    const newStaff = {
      ...staff,
      id: Date.now().toString(),
      joinedDate: new Date().toISOString(),
      isActive: true,
      isLocked: false,
      is_archived: false,
    };
    
    let updatedList = [...staffList, newStaff];
    
    const currentActive = updatedList.filter(s => !s.is_archived);
    if (!isPremium() && plan.type === 'Monthly') {
      const limit = 50;
      currentActive.sort((a, b) => new Date(a.joinedDate) - new Date(b.joinedDate));
      updatedList = updatedList.map(s => {
        if (s.is_archived) return s;
        const idx = currentActive.indexOf(s);
        return { ...s, isLocked: idx >= limit };
      });
    } else if (!isPremium()) {
      const limit = 5;
      currentActive.sort((a, b) => new Date(a.joinedDate) - new Date(b.joinedDate));
      updatedList = updatedList.map(s => {
        if (s.is_archived) return s;
        const idx = currentActive.indexOf(s);
        return { ...s, isLocked: idx >= limit };
      });
    }
    
    setStaffList(updatedList);
    await storageService.saveStaffList(updatedList);
    return { success: true };
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

  const archiveStaff = async (id) => {
    const updatedList = staffList.map(s => 
      s.id === id ? { ...s, is_archived: true, archived_at: new Date().toISOString() } : s
    );
    setStaffList(updatedList);
    await storageService.saveStaffList(updatedList);
  };

  const unarchiveStaff = async (id) => {
    const updatedList = staffList.map(s => 
      s.id === id ? { ...s, is_archived: false, archived_at: null } : s
    );
    setStaffList(updatedList);
    await storageService.saveStaffList(updatedList);
  };

  const markAttendance = async (staffId, date, status, note = null) => {
    const key = `${staffId}_${date}`;
    const updated = { ...attendance, [key]: status };
    setAttendance(updated);
    await storageService.saveAttendance(updated);
    
    if (note !== null) {
      const noteKey = `${staffId}_${date}`;
      const updatedNotes = { ...notes };
      if (note && note.trim()) {
        updatedNotes[noteKey] = note.trim();
      } else {
        delete updatedNotes[noteKey];
      }
      setNotes(updatedNotes);
      await storageService.saveNotes(updatedNotes);
    }
  };

  const getAttendance = (staffId, date) => {
    const key = `${staffId}_${date}`;
    return attendance[key] || null;
  };

  const getNote = (staffId, date) => {
    const noteKey = `${staffId}_${date}`;
    return notes[noteKey] || null;
  };

  const getStaffNotes = (staffId) => {
    const staffNotes = {};
    Object.keys(notes).forEach(key => {
      if (key.startsWith(`${staffId}_`)) {
        const date = key.substring(key.length - 10);
        staffNotes[date] = notes[key];
      }
    });
    return staffNotes;
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
    notes,
    plan,
    loading,
    isPlanActive,
    isPremium,
    getMaxStaffCount,
    getActiveStaffList,
    getArchivedStaffList,
    isStaffLocked,
    canEditStaff,
    canMarkAttendance,
    addStaff,
    updateStaff,
    deleteStaff,
    archiveStaff,
    unarchiveStaff,
    markAttendance,
    getAttendance,
    getNote,
    getStaffNotes,
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