import localforage from 'localforage';

// Configure standard localforage instances
const patientDB = localforage.createInstance({
  name: 'Gramsakhi',
  storeName: 'patients'
});

const symptomLogsDB = localforage.createInstance({
  name: 'Gramsakhi',
  storeName: 'symptom_logs'
});

const syncQueueDB = localforage.createInstance({
  name: 'Gramsakhi',
  storeName: 'sync_queue'
});

export const savePatientOffline = async (patientData) => {
  const id = patientData.id || `temp_${Date.now()}`;
  await patientDB.setItem(id, { ...patientData, id, offlineCreated: true });
  await addToSyncQueue('PATIENT', { ...patientData, id });
  return id;
};

export const saveSymptomLogOffline = async (logData) => {
  const id = logData.id || `temp_log_${Date.now()}`;
  await symptomLogsDB.setItem(id, { ...logData, id, offlineCreated: true });
  await addToSyncQueue('SYMPTOM_LOG', { ...logData, id });
  return id;
};

export const addToSyncQueue = async (type, payload) => {
  const syncItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    timestamp: Date.now()
  };
  await syncQueueDB.setItem(syncItem.id, syncItem);
};

export const getSyncQueue = async () => {
  const queue = [];
  await syncQueueDB.iterate((value) => {
    queue.push(value);
  });
  return queue.sort((a, b) => a.timestamp - b.timestamp);
};

export const clearSyncItem = async (id) => {
  await syncQueueDB.removeItem(id);
};

export const getAllOfflinePatients = async () => {
  const patients = [];
  await patientDB.iterate((value) => {
    patients.push(value);
  });
  return patients;
};

export const cachePatientsOffline = async (patients) => {
  for (const p of patients) {
    await patientDB.setItem(p.id, p);
  }
};

export const deletePatientOffline = async (patientId) => {
  // Remove from offline patient DB
  await patientDB.removeItem(patientId);

  // Remove any offline logs for this patient
  const logs = [];
  await symptomLogsDB.iterate((value, key) => {
    if (value.patientId === patientId) {
      logs.push(key);
    }
  });
  for (const logKey of logs) {
    await symptomLogsDB.removeItem(logKey);
  }

  // Check if there was an offline creation item for this patient in the queue
  const queue = await getSyncQueue();
  let wasOfflineCreated = false;
  for (const item of queue) {
    if (item.type === 'PATIENT' && item.payload?.id === patientId) {
      wasOfflineCreated = true;
      await clearSyncItem(item.id);
    } else if (item.payload?.patientId === patientId) {
      // Clear any symptom logs from the queue for this offline-created patient
      await clearSyncItem(item.id);
    }
  }

  // If it was not created offline (meaning it exists on the server), queue a delete action
  if (!wasOfflineCreated) {
    await addToSyncQueue('DELETE_PATIENT', { id: patientId });
  }
};
