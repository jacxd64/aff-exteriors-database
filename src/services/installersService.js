// Contractor / crew bank. A simple list you assign to installs and deliveries.
// Intentionally uncategorized — many contractors cover several trades, so the
// only structured fields are name + phone; everything else is freeform notes.
import { db } from './db';

const COLLECTION = 'installers';
const nowIso = () => new Date().toISOString();

const installersService = {
  subscribe(cb) {
    return db.subscribe(COLLECTION, { orderBy: ['name', 'asc'] }, cb);
  },
  async add(data, user) {
    return db.add(COLLECTION, {
      name: (data.name || '').trim(),
      phone: (data.phone || '').trim(),
      notes: (data.notes || '').trim(),
      active: data.active !== false,
      createdBy: user?.displayName || 'Unknown',
      createdAt: nowIso(),
    });
  },
  async update(id, patch) {
    return db.update(COLLECTION, id, patch);
  },
  async remove(id) {
    return db.remove(COLLECTION, id);
  },
};

export default installersService;
