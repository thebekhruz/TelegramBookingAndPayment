import sqlite3 from 'sqlite3';
import { promisify } from 'util';

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

export function initDatabase(dbPath: string): sqlite3.Database {
  const db = new sqlite3.Database(dbPath);

  // Enable foreign keys and create table
  db.serialize(() => {
    db.run(`
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
  });

  return db;
}

export class BookingService {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  async createBooking(
    userId: number,
    username: string | undefined,
    fullName: string,
    email: string,
    phone: string
  ): Promise<Booking> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO bookings (user_id, username, full_name, email, phone) VALUES (?, ?, ?, ?, ?)`,
        [userId, username, fullName, email, phone],
        function (err) {
          if (err) return reject(err);

          // Get the created booking
          this.db.get(
            'SELECT * FROM bookings WHERE id = ?',
            [this.lastID],
            (err, row) => {
              if (err) return reject(err);
              resolve(row as Booking);
            }
          );
        }.bind(this)
      );
    });
  }

  async getBookingById(id: number): Promise<Booking | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row as Booking | undefined);
      });
    });
  }

  async getBookingByUserId(userId: number): Promise<Booking | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM bookings WHERE user_id = ?', [userId], (err, row) => {
        if (err) return reject(err);
        resolve(row as Booking | undefined);
      });
    });
  }

  async updateBookingStatus(bookingId: number, status: 'pending' | 'confirmed'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE bookings SET status = ? WHERE id = ?',
        [status, bookingId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  async getAllBookings(): Promise<Booking[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM bookings ORDER BY created_at DESC', (err, rows) => {
        if (err) return reject(err);
        resolve(rows as Booking[]);
      });
    });
  }

  async deleteBooking(bookingId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM bookings WHERE id = ?', [bookingId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  close(): void {
    this.db.close();
  }
}
