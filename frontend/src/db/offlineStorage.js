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
