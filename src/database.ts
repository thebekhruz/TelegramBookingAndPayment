import Database from 'better-sqlite3';

export interface Booking {
  id: number;
  user_id: number;
  username?: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  status: 'pending' | 'confirmed';
}

export function initDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      username TEXT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending'
    )
  `);

  return db;
}

export class BookingService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  createBooking(userId: number, username: string | undefined, fullName: string, email: string, phone: string): Booking {
    const stmt = this.db.prepare(`
      INSERT INTO bookings (user_id, username, full_name, email, phone)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(userId, username, fullName, email, phone);
    return this.getBookingById(result.lastInsertRowid as number)!;
  }

  getBookingById(id: number): Booking | undefined {
    const stmt = this.db.prepare('SELECT * FROM bookings WHERE id = ?');
    return stmt.get(id) as Booking | undefined;
  }

  getBookingByUserId(userId: number): Booking | undefined {
    const stmt = this.db.prepare('SELECT * FROM bookings WHERE user_id = ?');
    return stmt.get(userId) as Booking | undefined;
  }

  updateBookingStatus(bookingId: number, status: 'pending' | 'confirmed'): void {
    const stmt = this.db.prepare('UPDATE bookings SET status = ? WHERE id = ?');
    stmt.run(status, bookingId);
  }

  getAllBookings(): Booking[] {
    const stmt = this.db.prepare('SELECT * FROM bookings ORDER BY created_at DESC');
    return stmt.all() as Booking[];
  }

  deleteBooking(bookingId: number): void {
    const stmt = this.db.prepare('DELETE FROM bookings WHERE id = ?');
    stmt.run(bookingId);
  }
}
