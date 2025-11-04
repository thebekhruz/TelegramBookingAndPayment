import Database from 'better-sqlite3';
import { Booking, Payment } from './schema';

export class BookingService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  createBooking(
    userId: number,
    username: string | undefined,
    fullName: string,
    email: string,
    phone: string
  ): Booking {
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

  updateBookingPaymentStatus(
    bookingId: number,
    status: 'pending' | 'paid' | 'failed' | 'cancelled',
    paymentMethod?: 'payme' | 'click',
    paymentId?: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE bookings
      SET payment_status = ?, payment_method = ?, payment_id = ?
      WHERE id = ?
    `);
    stmt.run(status, paymentMethod, paymentId, bookingId);
  }

  getAllBookings(): Booking[] {
    const stmt = this.db.prepare('SELECT * FROM bookings ORDER BY created_at DESC');
    return stmt.all() as Booking[];
  }

  getPaidBookings(): Booking[] {
    const stmt = this.db.prepare(
      "SELECT * FROM bookings WHERE payment_status = 'paid' ORDER BY created_at DESC"
    );
    return stmt.all() as Booking[];
  }

  createPayment(
    bookingId: number,
    paymentMethod: 'payme' | 'click',
    transactionId: string,
    amount: number,
    paymentDetails?: object
  ): Payment {
    const stmt = this.db.prepare(`
      INSERT INTO payments (booking_id, payment_method, transaction_id, amount, payment_details)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      bookingId,
      paymentMethod,
      transactionId,
      amount,
      paymentDetails ? JSON.stringify(paymentDetails) : null
    );

    return this.getPaymentById(result.lastInsertRowid as number)!;
  }

  getPaymentById(id: number): Payment | undefined {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE id = ?');
    return stmt.get(id) as Payment | undefined;
  }

  getPaymentByTransactionId(transactionId: string): Payment | undefined {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE transaction_id = ?');
    return stmt.get(transactionId) as Payment | undefined;
  }

  updatePaymentStatus(
    paymentId: number,
    status: 'pending' | 'paid' | 'failed' | 'cancelled'
  ): void {
    const stmt = this.db.prepare(`
      UPDATE payments
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(status, paymentId);
  }

  getPaymentsByBookingId(bookingId: number): Payment[] {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC');
    return stmt.all(bookingId) as Payment[];
  }

  deleteBooking(bookingId: number): void {
    // Delete associated payments first
    const deletePayments = this.db.prepare('DELETE FROM payments WHERE booking_id = ?');
    deletePayments.run(bookingId);

    // Delete booking
    const deleteBooking = this.db.prepare('DELETE FROM bookings WHERE id = ?');
    deleteBooking.run(bookingId);
  }
}
