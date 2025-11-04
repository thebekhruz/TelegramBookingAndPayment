import Database from 'better-sqlite3';

export interface Booking {
  id: number;
  user_id: number;
  username?: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled';
  payment_method?: 'payme' | 'click';
  payment_id?: string;
}

export interface Payment {
  id: number;
  booking_id: number;
  payment_method: 'payme' | 'click';
  transaction_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  payment_details?: string;
}

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  // Create bookings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      payment_id TEXT,
      UNIQUE(user_id)
    )
  `);

  // Create payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      payment_details TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings (id)
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
    CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
  `);

  return db;
}
