import { documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync, deleteAsync } from 'expo-file-system/legacy';

const getFileUri = (name) => documentDirectory + name;

async function readJSONFile(fileUri) {
  try {
    const info = await getInfoAsync(fileUri);
    if (!info.exists) {
      return null;
    }
    const content = await readAsStringAsync(fileUri);
    return content ? JSON.parse(content) : null;
  } catch (e) {
    console.log('[Storage] Read error:', e.message);
    return null;
  }
}

async function writeJSONFile(fileUri, data) {
  try {
    await writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('[Storage] Write error:', e.message);
    return false;
  }
}

export async function loadStaff() {
  const data = await readJSONFile(getFileUri('staff_data.json'));
  return data || [];
}

export async function saveStaff(staffList) {
  return await writeJSONFile(getFileUri('staff_data.json'), staffList);
}

export async function loadAttendance() {
  const data = await readJSONFile(getFileUri('attendance_data.json'));
  return data || [];
}

export async function saveAttendance(attendanceList) {
  return await writeJSONFile(getFileUri('attendance_data.json'), attendanceList);
}

export async function loadAdvances() {
  const data = await readJSONFile(getFileUri('advances_data.json'));
  return data || [];
}

export async function saveAdvances(advancesList) {
  return await writeJSONFile(getFileUri('advances_data.json'), advancesList);
}

export async function loadSyncQueue() {
  const data = await readJSONFile(getFileUri('sync_queue.json'));
  return data || [];
}

export async function saveSyncQueue(queue) {
  return await writeJSONFile(getFileUri('sync_queue.json'), queue);
}

export async function clearAllData() {
  try {
    const files = [
      getFileUri('staff_data.json'),
      getFileUri('attendance_data.json'),
      getFileUri('advances_data.json'),
      getFileUri('sync_queue.json')
    ];
    for (const f of files) {
      try {
        await deleteAsync(f, { idempotent: true });
      } catch (e) {}
    }
    console.log('[Storage] All data cleared');
  } catch (e) {
    console.error('[Storage] Clear error:', e);
  }
}