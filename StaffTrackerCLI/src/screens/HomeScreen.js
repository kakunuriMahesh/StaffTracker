import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { addStaffReloadListener } from '../services/staffReload';

const TODAY = new Date().toISOString().split('T')[0];
const STATUS_COLOR = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const STATUS_TEXT = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const STATUS_ICON = {
  P: 'checkmark-circle',
  A: 'close-circle',
  L: 'time-outline',
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    getActiveStaffList,
    attendance,
    isStaffLocked,
    isPlanActive,
    isPremium,
    markAttendance,
    getAttendance,
    canMarkAttendance,
    reloadData,
  } = useApp();

  const [todayMap, setTodayMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [showActionPopup, setShowActionPopup] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    const removeListener = addStaffReloadListener(() => {
      reloadData();
    });
    return removeListener;
  }, []);

  useEffect(() => {
    const activeList = getActiveStaffList();
    const map = {};
    activeList.forEach((s) => {
      const att = getAttendance(s.id, TODAY);
      if (att) map[s.id] = att;
    });
    setTodayMap(map);
  }, [attendance]);

  useFocusEffect(
    useCallback(() => {
      const activeList = getActiveStaffList();
      const map = {};
      activeList.forEach((s) => {
        const att = getAttendance(s.id, TODAY);
        if (att) map[s.id] = att;
      });
      setTodayMap(map);
    }, [])
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'Maid': return 'home-outline';
      case 'Cook': return 'restaurant-outline';
      case 'Driver': return 'car-outline';
      case 'Gardener': return 'leaf-outline';
      case 'Security': return 'shield-checkmark-outline';
      case 'Watchman': return 'eye-outline';
      default: return 'person-outline';
    }
  };

  const renderItem = ({ item }) => {
    const status = todayMap[item.id];
    const isLocked = isStaffLocked(item);

    return (
      <TouchableOpacity
        style={[styles.card, isLocked && styles.cardLocked]}
        onPress={() => navigation.navigate('StaffDetail', { staffId: item.id })}
      >
        <View style={[styles.avatar, isLocked && styles.avatarLocked]}>
          <Text style={[styles.avatarText, isLocked && styles.avatarTextLocked]}>
            {item.name ? item.name[0].toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, isLocked && styles.nameLocked]}>
              {item.name}
            </Text>
            {isLocked && (
              <Icon name="lock-closed" size={14} color="#9CA3AF" style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={styles.roleRow}>
            <Icon name={getRoleIcon(item.position)} size={12} color="#6B7280" />
            <Text style={styles.role}>{item.position || 'Staff'}</Text>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.salary}>₹{item.salary || 0}</Text>
            <Text style={styles.salaryFreq}>/{item.salary_type === 'daily' ? 'day' : 'mo'}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.badge, status ? { backgroundColor: STATUS_COLOR[status] } : styles.badgeEmpty]}
          onPress={() => !isLocked && openActionPopup(item.id)}
          disabled={isLocked}
          activeOpacity={0.7}
        >
          <Icon name={status ? STATUS_ICON[status] : 'ellipse-outline'} size={18} color={status ? STATUS_TEXT[status] : '#9CA3AF'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const openActionPopup = (staffId) => {
    setSelectedStaffId(staffId);
    setShowActionPopup(true);
  };

  const handleQuickMark = async (status) => {
    if (!selectedStaffId) return;
    setShowActionPopup(false);
    try {
      await markAttendance(selectedStaffId, TODAY, status, notesMap[selectedStaffId] || '');
      setTodayMap(prev => ({ ...prev, [selectedStaffId]: status }));
      reloadData();
    } catch (error) {
      console.log('Mark attendance error:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const openNoteModal = () => {
    setShowActionPopup(false);
    setNoteText(notesMap[selectedStaffId] || '');
    setShowNoteModal(true);
  };

  const saveNote = async () => {
    if (!selectedStaffId) return;
    try {
      const currentStatus = todayMap[selectedStaffId] || 'P';
      await markAttendance(selectedStaffId, TODAY, currentStatus, noteText.trim());
      if (noteText.trim()) {
        setNotesMap(prev => ({ ...prev, [selectedStaffId]: noteText.trim() }));
      } else {
        const newNotes = { ...notesMap };
        delete newNotes[selectedStaffId];
        setNotesMap(newNotes);
      }
      setShowNoteModal(false);
      setNoteText('');
      reloadData();
    } catch (error) {
      console.log('Save note error:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const formatDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
  };

  const activeStaff = getActiveStaffList();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Staff</Text>
          <View style={styles.subtitleRow}>
            <Icon name="calendar-outline" size={12} color="#6B7280" />
            <Text style={styles.subtitle}>{formatDate()}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.archiveBtn} onPress={() => navigation.navigate('Archive')}>
            <Icon name="archive-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddStaff')}>
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
      {activeStaff.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconContainer}>
            <Icon name="people-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No staff added yet</Text>
          <Text style={styles.emptyDesc}>Tap "Add" to add your first staff member.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddStaff')}>
            <Icon name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Add Staff</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeStaff}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>

    <Modal visible={showActionPopup} transparent animationType="fade" onRequestClose={() => setShowActionPopup(false)}>
      <Pressable style={styles.modalOverlay} onPress={() => setShowActionPopup(false)}>
        <Pressable style={styles.actionPopup} onPress={() => {}}>
          <Text style={styles.actionTitle}>Mark Attendance</Text>
          <Text style={styles.actionSubtitle}>For today</Text>
          <View style={styles.actionBtns}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnP]} onPress={() => handleQuickMark('P')}>
              <Icon name="checkmark-circle" size={24} color="#065F46" />
              <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnA]} onPress={() => handleQuickMark('A')}>
              <Icon name="close-circle" size={24} color="#991B1B" />
              <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Absent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnL]} onPress={() => handleQuickMark('L')}>
              <Icon name="time-outline" size={24} color="#92400E" />
              <Text style={[styles.actionBtnText, { color: '#92400E' }]}>Leave</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnNote]} onPress={openNoteModal}>
              <Icon name="document-text-outline" size={24} color="#2563EB" />
              <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Note</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actionCancelBtn} onPress={() => setShowActionPopup(false)}>
            <Text style={styles.actionCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    <Modal visible={showNoteModal} transparent animationType="fade" onRequestClose={() => setShowNoteModal(false)}>
      <Pressable style={styles.modalOverlay} onPress={() => setShowNoteModal(false)}>
        <Pressable style={styles.noteModalBox} onPress={() => {}}>
          <View style={styles.noteModalHeader}>
            <Text style={styles.noteModalTitle}>Add Note</Text>
            <TouchableOpacity onPress={() => setShowNoteModal(false)}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <Text style={styles.noteModalDate}>Today</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Enter note..."
            placeholderTextColor="#9CA3AF"
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.noteModalBtns}>
            <TouchableOpacity 
              style={styles.noteModalCancelBtn}
              onPress={() => { setShowNoteModal(false); setNoteText(''); }}
            >
              <Text style={styles.noteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.noteModalSaveBtn}
              onPress={saveNote}
            >
              <Text style={styles.noteModalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 4 },
  archiveBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLocked: { opacity: 0.7, borderColor: '#D1D5DB' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLocked: { backgroundColor: '#E5E7EB' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#1D4ED8' },
  avatarTextLocked: { color: '#9CA3AF' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  nameLocked: { color: '#6B7280' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  roleRow: { flexDirection: 'row', alignItems: 'center' },
  role: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  separator: { fontSize: 13, color: '#9CA3AF', marginHorizontal: 6 },
  salary: { fontSize: 13, fontWeight: '600', color: '#059669' },
  salaryFreq: { fontSize: 11, color: '#6B7280' },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmpty: { backgroundColor: '#F3F4F6' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  actionPopup: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '85%', maxWidth: 320 },
  actionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
  actionSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  actionBtns: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  actionBtn: { width: '47%', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnP: { backgroundColor: '#D1FAE5' },
  actionBtnA: { backgroundColor: '#FEE2E2' },
  actionBtnL: { backgroundColor: '#FEF3C7' },
  actionBtnNote: { backgroundColor: '#EFF6FF', width: '100%' },
  actionBtnText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  actionCancelBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
  actionCancelText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  noteModalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '85%', maxWidth: 320 },
  noteModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  noteModalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  noteModalDate: { fontSize: 13, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
  noteInput: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', minHeight: 100, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  noteModalBtns: { flexDirection: 'row', gap: 12 },
  noteModalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  noteModalCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  noteModalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center' },
  noteModalSaveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

export default HomeScreen;