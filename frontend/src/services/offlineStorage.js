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
        await db.add(STORE_NAME, { ...record, timestamp, synced: false });
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
