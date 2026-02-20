import { openDB } from 'idb';

const DB_NAME = 'ponto_app_db';
const STORE_NAME = 'pending_records';
const DB_VERSION = 1;

export const offlineStorage = {
    async getDB() {
        return openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            },
        });
    },

    async saveRecord(record) {
        const db = await this.getDB();
        const timestamp = new Date().toISOString();
        // sync_id único para evitar duplicatas quando a rede pisca
        const sync_id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Verificar se já existe registro do mesmo usuário/tipo nos últimos 5 minutos
        const existing = await db.getAll(STORE_NAME);
        const isDuplicate = existing.some(r => {
            const timeDiff = Math.abs(new Date(timestamp) - new Date(r.timestamp));
            return (r.matricula === record.matricula || r.user_id === record.user_id)
                && r.record_type === record.record_type
                && timeDiff < 5 * 60 * 1000; // 5 minutos
        });

        if (isDuplicate) {
            console.warn('Registro duplicado detectado, ignorando');
            return false;
        }

        await db.add(STORE_NAME, { ...record, timestamp, sync_id, synced: false });
        return true;
    },

    async getPendingRecords() {
        const db = await this.getDB();
        return db.getAll(STORE_NAME);
    },

    async deleteRecord(id) {
        const db = await this.getDB();
        await db.delete(STORE_NAME, id);
    },

    async clearRecords() {
        const db = await this.getDB();
        await db.clear(STORE_NAME);
    }
};
