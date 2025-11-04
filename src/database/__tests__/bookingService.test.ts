import { BookingService } from '../bookingService';
import { initializeDatabase } from '../schema';
import Database from 'better-sqlite3';

describe('BookingService', () => {
  let db: Database.Database;
  let bookingService: BookingService;

  beforeEach(() => {
    // Create in-memory database for testing
    db = initializeDatabase(':memory:');
    bookingService = new BookingService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('createBooking', () => {
    it('should create a new booking', () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      expect(booking).toBeDefined();
      expect(booking.id).toBeDefined();
      expect(booking.user_id).toBe(123456);
      expect(booking.username).toBe('testuser');
      expect(booking.full_name).toBe('Test User');
      expect(booking.email).toBe('test@example.com');
      expect(booking.phone).toBe('+998901234567');
      expect(booking.payment_status).toBe('pending');
    });

    it('should not allow duplicate bookings for same user', () => {
      bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      expect(() => {
        bookingService.createBooking(
          123456,
          'testuser',
          'Test User 2',
          'test2@example.com',
          '+998901234568'
        );
      }).toThrow();
    });
  });

  describe('getBookingById', () => {
    it('should retrieve booking by id', () => {
      const created = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const retrieved = bookingService.getBookingById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.user_id).toBe(123456);
    });

    it('should return undefined for non-existent booking', () => {
      const booking = bookingService.getBookingById(999);
      expect(booking).toBeUndefined();
    });
  });

  describe('getBookingByUserId', () => {
    it('should retrieve booking by user id', () => {
      const created = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const retrieved = bookingService.getBookingByUserId(123456);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.user_id).toBe(123456);
    });

    it('should return undefined for non-existent user', () => {
      const booking = bookingService.getBookingByUserId(999);
      expect(booking).toBeUndefined();
    });
  });

  describe('updateBookingPaymentStatus', () => {
    it('should update booking payment status', () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      bookingService.updateBookingPaymentStatus(booking.id, 'paid', 'payme', 'txn_123');

      const updated = bookingService.getBookingById(booking.id);
      expect(updated?.payment_status).toBe('paid');
      expect(updated?.payment_method).toBe('payme');
      expect(updated?.payment_id).toBe('txn_123');
    });
  });

  describe('getAllBookings', () => {
    it('should return all bookings', () => {
      bookingService.createBooking(
        123456,
        'testuser1',
        'Test User 1',
        'test1@example.com',
        '+998901234567'
      );

      bookingService.createBooking(
        123457,
        'testuser2',
        'Test User 2',
        'test2@example.com',
        '+998901234568'
      );

      const bookings = bookingService.getAllBookings();
      expect(bookings).toHaveLength(2);
    });

    it('should return empty array when no bookings exist', () => {
      const bookings = bookingService.getAllBookings();
      expect(bookings).toHaveLength(0);
    });
  });

  describe('getPaidBookings', () => {
    it('should return only paid bookings', () => {
      const booking1 = bookingService.createBooking(
        123456,
        'testuser1',
        'Test User 1',
        'test1@example.com',
        '+998901234567'
      );

      const booking2 = bookingService.createBooking(
        123457,
        'testuser2',
        'Test User 2',
        'test2@example.com',
        '+998901234568'
      );

      bookingService.updateBookingPaymentStatus(booking1.id, 'paid', 'payme', 'txn_123');

      const paidBookings = bookingService.getPaidBookings();
      expect(paidBookings).toHaveLength(1);
      expect(paidBookings[0].id).toBe(booking1.id);
      expect(paidBookings[0].payment_status).toBe('paid');
    });
  });

  describe('createPayment', () => {
    it('should create a new payment record', () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const payment = bookingService.createPayment(
        booking.id,
        'payme',
        'txn_123',
        100000,
        { test: 'data' }
      );

      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.booking_id).toBe(booking.id);
      expect(payment.payment_method).toBe('payme');
      expect(payment.transaction_id).toBe('txn_123');
      expect(payment.amount).toBe(100000);
      expect(payment.status).toBe('pending');
    });

    it('should not allow duplicate transaction IDs', () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      bookingService.createPayment(booking.id, 'payme', 'txn_123', 100000);

      expect(() => {
        bookingService.createPayment(booking.id, 'payme', 'txn_123', 100000);
      }).toThrow();
    });
  });

  describe('getPaymentByTransactionId', () => {
    it('should retrieve payment by transaction ID', () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const created = bookingService.createPayment(booking.id, 'payme', 'txn_123', 100000);

      const retrieved = bookingService.getPaymentByTransactionId('txn_123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.transaction_id).toBe('txn_123');
    });

    it('should return undefined for non-existent transaction', () => {
      const payment = bookingService.getPaymentByTransactionId('non_existent');
      expect(payment).toBeUndefined();
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const payment = bookingService.createPayment(booking.id, 'payme', 'txn_123', 100000);

      bookingService.updatePaymentStatus(payment.id, 'paid');

      const updated = bookingService.getPaymentById(payment.id);
      expect(updated?.status).toBe('paid');
    });
  });

  describe('getPaymentsByBookingId', () => {
    it('should return all payments for a booking', () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      bookingService.createPayment(booking.id, 'payme', 'txn_123', 100000);
      bookingService.createPayment(booking.id, 'click', 'txn_456', 100000);

      const payments = bookingService.getPaymentsByBookingId(booking.id);
      expect(payments).toHaveLength(2);
    });
  });

  describe('deleteBooking', () => {
    it('should delete booking and associated payments', () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const payment = bookingService.createPayment(booking.id, 'payme', 'txn_123', 100000);

      bookingService.deleteBooking(booking.id);

      const deletedBooking = bookingService.getBookingById(booking.id);
      const deletedPayment = bookingService.getPaymentById(payment.id);

      expect(deletedBooking).toBeUndefined();
      expect(deletedPayment).toBeUndefined();
    });
  });
});
