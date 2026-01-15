import { useState, useEffect, createContext, useContext } from 'react';
import { offlineStorage } from './offlineStorage';
import api from './api';

const SyncContext = createContext({});

export const SyncProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncRecords();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        checkPending();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const checkPending = async () => {
        const records = await offlineStorage.getPendingRecords();
        setPendingCount(records.length);
    };

    const syncRecords = async () => {
        const records = await offlineStorage.getPendingRecords();
        if (records.length === 0) return;

        setIsSyncing(true);
        console.log(`🔄 Sincronizando ${records.length} registros...`);

        let successCount = 0;

        for (const record of records) {
            try {
                if (record.isDutyShift) {
                    await api.post('/duty-shifts/mark-presence', {
                        user_id: record.user_id,
                        photo: record.photo,
                        notes: record.notes,
                        latitude: record.latitude,
                        longitude: record.longitude,
                        accuracy: record.accuracy,
                        timestamp: record.timestamp // Important: Backend needs to accept this
                    });
                } else {
                    await api.post('/tablet/register', {
                        matricula: record.matricula,
                        record_type: record.record_type,
                        photo: record.photo,
                        latitude: record.latitude,
                        longitude: record.longitude,
                        accuracy: record.accuracy,
                        timestamp: record.timestamp // Important: Backend needs to accept this
                    });
                }

                await offlineStorage.deleteRecord(record.id);
                successCount++;
            } catch (err) {
                console.error('Erro ao sincronizar registro:', err);
            }
        }

        setIsSyncing(false);
        checkPending();

        if (successCount > 0) {
            // Optional: Notify user via toast
            console.log(`✅ ${successCount} registros sincronizados com sucesso!`);
        }
    };

    return (
        <SyncContext.Provider value={{ isOnline, isSyncing, pendingCount, syncRecords, checkPending }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => useContext(SyncContext);
