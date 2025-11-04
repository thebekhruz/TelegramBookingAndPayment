import { PaymeService } from '../payme';
import { BookingService } from '../../database/bookingService';
import { initializeDatabase } from '../../database/schema';
import Database from 'better-sqlite3';
import { config } from '../../config/config';

describe('PaymeService', () => {
  let db: Database.Database;
  let bookingService: BookingService;
  let paymeService: PaymeService;

  beforeEach(() => {
    // Create in-memory database for testing
    db = initializeDatabase(':memory:');
    bookingService = new BookingService(db);
    paymeService = new PaymeService(bookingService);
  });

  afterEach(() => {
    db.close();
  });

  describe('generatePaymentUrl', () => {
    it('should generate a valid payment URL', () => {
      const bookingId = 1;
      const amount = 100000;
      const url = paymeService.generatePaymentUrl(bookingId, amount);

      expect(url).toContain(config.payme.endpoint);
      expect(url).toBeTruthy();
    });
  });

  describe('verifyAuthorization', () => {
    it('should verify valid authorization header', () => {
      const credentials = Buffer.from(`Paycom:${config.payme.secretKey}`).toString('base64');
      const authHeader = `Basic ${credentials}`;

      const isValid = paymeService.verifyAuthorization(authHeader);
      expect(isValid).toBe(true);
    });

    it('should reject invalid authorization header', () => {
      const authHeader = 'Basic invalid_credentials';
      const isValid = paymeService.verifyAuthorization(authHeader);
      expect(isValid).toBe(false);
    });

    it('should reject missing authorization header', () => {
      const isValid = paymeService.verifyAuthorization('');
      expect(isValid).toBe(false);
    });
  });

  describe('CheckPerformTransaction', () => {
    it('should allow transaction for valid booking', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const params = {
        account: { booking_id: booking.id.toString() },
        amount: config.conference.ticketPrice,
      };

      const result = await paymeService.handleRequest('CheckPerformTransaction', params);
      expect(result.allow).toBe(true);
    });

    it('should reject transaction for non-existent booking', async () => {
      const params = {
        account: { booking_id: '999' },
        amount: config.conference.ticketPrice,
      };

      await expect(
        paymeService.handleRequest('CheckPerformTransaction', params)
      ).rejects.toMatchObject({
        code: -31050,
        message: 'Booking not found',
      });
    });

    it('should reject transaction for already paid booking', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      bookingService.updateBookingPaymentStatus(booking.id, 'paid', 'payme', 'test_txn');

      const params = {
        account: { booking_id: booking.id.toString() },
        amount: config.conference.ticketPrice,
      };

      await expect(
        paymeService.handleRequest('CheckPerformTransaction', params)
      ).rejects.toMatchObject({
        code: -31051,
        message: 'Booking already paid',
      });
    });

    it('should reject transaction with invalid amount', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const params = {
        account: { booking_id: booking.id.toString() },
        amount: 50000, // Wrong amount
      };

      await expect(
        paymeService.handleRequest('CheckPerformTransaction', params)
      ).rejects.toMatchObject({
        code: -31001,
        message: 'Invalid amount',
      });
    });
  });

  describe('CreateTransaction', () => {
    it('should create a new transaction', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const params = {
        id: 'test_transaction_id',
        account: { booking_id: booking.id.toString() },
        amount: config.conference.ticketPrice,
        time: Date.now(),
      };

      const result = await paymeService.handleRequest('CreateTransaction', params);

      expect(result).toHaveProperty('create_time');
      expect(result).toHaveProperty('transaction');
      expect(result.state).toBe(1); // Pending state
    });

    it('should return existing transaction if already created', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const params = {
        id: 'test_transaction_id',
        account: { booking_id: booking.id.toString() },
        amount: config.conference.ticketPrice,
        time: Date.now(),
      };

      // Create transaction first time
      const result1 = await paymeService.handleRequest('CreateTransaction', params);

      // Try creating same transaction again
      const result2 = await paymeService.handleRequest('CreateTransaction', params);

      expect(result1.transaction).toBe(result2.transaction);
    });
  });

  describe('PerformTransaction', () => {
    it('should perform transaction successfully', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      // Create transaction first
      const createParams = {
        id: 'test_transaction_id',
        account: { booking_id: booking.id.toString() },
        amount: config.conference.ticketPrice,
        time: Date.now(),
      };

      await paymeService.handleRequest('CreateTransaction', createParams);

      // Perform transaction
      const performParams = {
        id: 'test_transaction_id',
      };

      const result = await paymeService.handleRequest('PerformTransaction', performParams);

      expect(result.state).toBe(2); // Paid state
      expect(result).toHaveProperty('perform_time');

      // Verify booking status updated
      const updatedBooking = bookingService.getBookingById(booking.id);
      expect(updatedBooking?.payment_status).toBe('paid');
    });

    it('should reject perform for non-existent transaction', async () => {
      const params = {
        id: 'non_existent_transaction',
      };

      await expect(
        paymeService.handleRequest('PerformTransaction', params)
      ).rejects.toMatchObject({
        code: -31003,
        message: 'Transaction not found',
      });
    });
  });

  describe('CancelTransaction', () => {
    it('should cancel transaction successfully', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      // Create transaction
      const createParams = {
        id: 'test_transaction_id',
        account: { booking_id: booking.id.toString() },
        amount: config.conference.ticketPrice,
        time: Date.now(),
      };

      await paymeService.handleRequest('CreateTransaction', createParams);

      // Cancel transaction
      const cancelParams = {
        id: 'test_transaction_id',
        reason: 1,
      };

      const result = await paymeService.handleRequest('CancelTransaction', cancelParams);

      expect(result.state).toBe(-1); // Cancelled state
      expect(result).toHaveProperty('cancel_time');

      // Verify booking status updated
      const updatedBooking = bookingService.getBookingById(booking.id);
      expect(updatedBooking?.payment_status).toBe('cancelled');
    });
  });

  describe('CheckTransaction', () => {
    it('should return transaction status', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      // Create transaction
      const createParams = {
        id: 'test_transaction_id',
        account: { booking_id: booking.id.toString() },
        amount: config.conference.ticketPrice,
        time: Date.now(),
      };

      await paymeService.handleRequest('CreateTransaction', createParams);

      // Check transaction
      const checkParams = {
        id: 'test_transaction_id',
      };

      const result = await paymeService.handleRequest('CheckTransaction', checkParams);

      expect(result).toHaveProperty('create_time');
      expect(result).toHaveProperty('transaction');
      expect(result.state).toBe(1); // Pending state
    });
  });
});
