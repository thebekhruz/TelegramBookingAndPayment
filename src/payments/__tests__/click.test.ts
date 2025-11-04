import crypto from 'crypto';
import { ClickService } from '../click';
import { BookingService } from '../../database/bookingService';
import { initializeDatabase } from '../../database/schema';
import Database from 'better-sqlite3';
import { config } from '../../config/config';

describe('ClickService', () => {
  let db: Database.Database;
  let bookingService: BookingService;
  let clickService: ClickService;

  beforeEach(() => {
    // Create in-memory database for testing
    db = initializeDatabase(':memory:');
    bookingService = new BookingService(db);
    clickService = new ClickService(bookingService);
  });

  afterEach(() => {
    db.close();
  });

  const generateSignature = (
    clickTransId: string,
    serviceId: string,
    secretKey: string,
    merchantTransId: string,
    amount: string,
    action: string,
    signTime: string
  ): string => {
    const signData = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${amount}${action}${signTime}`;
    return crypto.createHash('md5').update(signData).digest('hex');
  };

  describe('generatePaymentUrl', () => {
    it('should generate a valid payment URL', () => {
      const bookingId = 1;
      const amount = 100000;
      const url = clickService.generatePaymentUrl(bookingId, amount);

      expect(url).toContain('my.click.uz');
      expect(url).toContain(config.click.serviceId);
      expect(url).toContain(config.click.merchantId);
      expect(url).toContain(amount.toString());
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const clickTransId = '12345';
      const serviceId = config.click.serviceId;
      const secretKey = config.click.secretKey;
      const merchantTransId = '1';
      const amount = '1000';
      const action = '0';
      const signTime = '2024-01-01 12:00:00';

      const signature = generateSignature(
        clickTransId,
        serviceId,
        secretKey,
        merchantTransId,
        amount,
        action,
        signTime
      );

      const isValid = clickService.verifySignature(
        clickTransId,
        serviceId,
        secretKey,
        merchantTransId,
        amount,
        action,
        signTime,
        signature
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const isValid = clickService.verifySignature(
        '12345',
        config.click.serviceId,
        config.click.secretKey,
        '1',
        '1000',
        '0',
        '2024-01-01 12:00:00',
        'invalid_signature'
      );

      expect(isValid).toBe(false);
    });
  });

  describe('handlePrepare', () => {
    it('should prepare transaction successfully', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const clickTransId = 'click_12345';
      const amount = (config.conference.ticketPrice / 100).toString(); // Convert to sum
      const action = '0';
      const signTime = '2024-01-01 12:00:00';

      const signString = generateSignature(
        clickTransId,
        config.click.serviceId,
        config.click.secretKey,
        booking.id.toString(),
        amount,
        action,
        signTime
      );

      const params = {
        click_trans_id: clickTransId,
        service_id: config.click.serviceId,
        click_paydoc_id: '123',
        merchant_trans_id: booking.id.toString(),
        amount,
        action,
        error: '0',
        error_note: '',
        sign_time: signTime,
        sign_string: signString,
      };

      const result = await clickService.handlePrepare(params);

      expect(result.error).toBe(0);
      expect(result.error_note).toBe('Success');
      expect(result.merchant_prepare_id).toBeDefined();
    });

    it('should reject prepare with invalid signature', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const params = {
        click_trans_id: 'click_12345',
        service_id: config.click.serviceId,
        click_paydoc_id: '123',
        merchant_trans_id: booking.id.toString(),
        amount: '1000',
        action: '0',
        error: '0',
        error_note: '',
        sign_time: '2024-01-01 12:00:00',
        sign_string: 'invalid_signature',
      };

      const result = await clickService.handlePrepare(params);

      expect(result.error).toBe(-1);
      expect(result.error_note).toBe('Invalid signature');
    });

    it('should reject prepare for non-existent booking', async () => {
      const clickTransId = 'click_12345';
      const amount = '1000';
      const action = '0';
      const signTime = '2024-01-01 12:00:00';

      const signString = generateSignature(
        clickTransId,
        config.click.serviceId,
        config.click.secretKey,
        '999', // Non-existent booking
        amount,
        action,
        signTime
      );

      const params = {
        click_trans_id: clickTransId,
        service_id: config.click.serviceId,
        click_paydoc_id: '123',
        merchant_trans_id: '999',
        amount,
        action,
        error: '0',
        error_note: '',
        sign_time: signTime,
        sign_string: signString,
      };

      const result = await clickService.handlePrepare(params);

      expect(result.error).toBe(-5);
      expect(result.error_note).toBe('Booking not found');
    });

    it('should reject prepare for already paid booking', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      bookingService.updateBookingPaymentStatus(booking.id, 'paid', 'click', 'prev_txn');

      const clickTransId = 'click_12345';
      const amount = (config.conference.ticketPrice / 100).toString();
      const action = '0';
      const signTime = '2024-01-01 12:00:00';

      const signString = generateSignature(
        clickTransId,
        config.click.serviceId,
        config.click.secretKey,
        booking.id.toString(),
        amount,
        action,
        signTime
      );

      const params = {
        click_trans_id: clickTransId,
        service_id: config.click.serviceId,
        click_paydoc_id: '123',
        merchant_trans_id: booking.id.toString(),
        amount,
        action,
        error: '0',
        error_note: '',
        sign_time: signTime,
        sign_string: signString,
      };

      const result = await clickService.handlePrepare(params);

      expect(result.error).toBe(-4);
      expect(result.error_note).toBe('Already paid');
    });
  });

  describe('handleComplete', () => {
    it('should complete transaction successfully', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const clickTransId = 'click_12345';
      const amount = (config.conference.ticketPrice / 100).toString();
      const action = '0';
      const signTime = '2024-01-01 12:00:00';

      // First, prepare
      const prepareSignString = generateSignature(
        clickTransId,
        config.click.serviceId,
        config.click.secretKey,
        booking.id.toString(),
        amount,
        action,
        signTime
      );

      const prepareParams = {
        click_trans_id: clickTransId,
        service_id: config.click.serviceId,
        click_paydoc_id: '123',
        merchant_trans_id: booking.id.toString(),
        amount,
        action,
        error: '0',
        error_note: '',
        sign_time: signTime,
        sign_string: prepareSignString,
      };

      const prepareResult = await clickService.handlePrepare(prepareParams);
      expect(prepareResult.error).toBe(0);

      // Then, complete
      const completeAction = '1';
      const completeSignString = generateSignature(
        clickTransId,
        config.click.serviceId,
        config.click.secretKey,
        booking.id.toString(),
        amount,
        completeAction,
        signTime
      );

      const completeParams = {
        click_trans_id: clickTransId,
        service_id: config.click.serviceId,
        click_paydoc_id: '123',
        merchant_trans_id: booking.id.toString(),
        merchant_prepare_id: prepareResult.merchant_prepare_id.toString(),
        amount,
        action: completeAction,
        error: '0',
        error_note: '',
        sign_time: signTime,
        sign_string: completeSignString,
      };

      const result = await clickService.handleComplete(completeParams);

      expect(result.error).toBe(0);
      expect(result.error_note).toBe('Success');

      // Verify booking status updated
      const updatedBooking = bookingService.getBookingById(booking.id);
      expect(updatedBooking?.payment_status).toBe('paid');
    });

    it('should reject complete with invalid signature', async () => {
      const params = {
        click_trans_id: 'click_12345',
        service_id: config.click.serviceId,
        click_paydoc_id: '123',
        merchant_trans_id: '1',
        merchant_prepare_id: '1',
        amount: '1000',
        action: '1',
        error: '0',
        error_note: '',
        sign_time: '2024-01-01 12:00:00',
        sign_string: 'invalid_signature',
      };

      const result = await clickService.handleComplete(params);

      expect(result.error).toBe(-1);
      expect(result.error_note).toBe('Invalid signature');
    });
  });
});
