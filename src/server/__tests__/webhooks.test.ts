import request from 'supertest';
import express from 'express';
import { setupWebhooks } from '../webhooks';
import { PaymeService } from '../../payments/payme';
import { ClickService } from '../../payments/click';
import { BookingService } from '../../database/bookingService';
import { initializeDatabase } from '../../database/schema';
import Database from 'better-sqlite3';
import { config } from '../../config/config';
import crypto from 'crypto';

describe('Webhook Integration Tests', () => {
  let app: express.Application;
  let db: Database.Database;
  let bookingService: BookingService;
  let paymeService: PaymeService;
  let clickService: ClickService;

  beforeEach(() => {
    // Create in-memory database for testing
    db = initializeDatabase(':memory:');
    bookingService = new BookingService(db);
    paymeService = new PaymeService(bookingService);
    clickService = new ClickService(bookingService);

    // Setup express app
    app = express();
    setupWebhooks(app, paymeService, clickService);
  });

  afterEach(() => {
    db.close();
  });

  describe('Payme Webhook', () => {
    const getAuthHeader = (): string => {
      const credentials = Buffer.from(`Paycom:${config.payme.secretKey}`).toString('base64');
      return `Basic ${credentials}`;
    };

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .post('/webhooks/payme')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'CheckPerformTransaction',
          params: {},
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(-32504);
    });

    it('should handle CheckPerformTransaction', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const response = await request(app)
        .post('/webhooks/payme')
        .set('Authorization', getAuthHeader())
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'CheckPerformTransaction',
          params: {
            account: { booking_id: booking.id.toString() },
            amount: config.conference.ticketPrice,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.result.allow).toBe(true);
    });

    it('should handle CreateTransaction', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const response = await request(app)
        .post('/webhooks/payme')
        .set('Authorization', getAuthHeader())
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'CreateTransaction',
          params: {
            id: 'test_txn_123',
            account: { booking_id: booking.id.toString() },
            amount: config.conference.ticketPrice,
            time: Date.now(),
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.result.state).toBe(1); // Pending
      expect(response.body.result.transaction).toBeDefined();
    });

    it('should handle PerformTransaction', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      // Create transaction first
      await request(app)
        .post('/webhooks/payme')
        .set('Authorization', getAuthHeader())
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'CreateTransaction',
          params: {
            id: 'test_txn_123',
            account: { booking_id: booking.id.toString() },
            amount: config.conference.ticketPrice,
            time: Date.now(),
          },
        });

      // Perform transaction
      const response = await request(app)
        .post('/webhooks/payme')
        .set('Authorization', getAuthHeader())
        .send({
          jsonrpc: '2.0',
          id: 2,
          method: 'PerformTransaction',
          params: {
            id: 'test_txn_123',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.result.state).toBe(2); // Paid

      // Verify booking status
      const updatedBooking = bookingService.getBookingById(booking.id);
      expect(updatedBooking?.payment_status).toBe('paid');
    });
  });

  describe('Click Webhook', () => {
    const generateSignature = (
      clickTransId: string,
      merchantTransId: string,
      amount: string,
      action: string,
      signTime: string
    ): string => {
      const signData = `${clickTransId}${config.click.serviceId}${config.click.secretKey}${merchantTransId}${amount}${action}${signTime}`;
      return crypto.createHash('md5').update(signData).digest('hex');
    };

    it('should handle Click prepare request', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const clickTransId = 'click_test_123';
      const amount = (config.conference.ticketPrice / 100).toString();
      const action = '0';
      const signTime = '2024-01-01 12:00:00';
      const signString = generateSignature(
        clickTransId,
        booking.id.toString(),
        amount,
        action,
        signTime
      );

      const response = await request(app)
        .post('/webhooks/click/prepare')
        .send({
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
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBe(0);
      expect(response.body.merchant_prepare_id).toBeDefined();
    });

    it('should handle Click complete request', async () => {
      const booking = bookingService.createBooking(
        123456,
        'testuser',
        'Test User',
        'test@example.com',
        '+998901234567'
      );

      const clickTransId = 'click_test_123';
      const amount = (config.conference.ticketPrice / 100).toString();
      const signTime = '2024-01-01 12:00:00';

      // Prepare first
      const prepareAction = '0';
      const prepareSignString = generateSignature(
        clickTransId,
        booking.id.toString(),
        amount,
        prepareAction,
        signTime
      );

      const prepareResponse = await request(app)
        .post('/webhooks/click/prepare')
        .send({
          click_trans_id: clickTransId,
          service_id: config.click.serviceId,
          click_paydoc_id: '123',
          merchant_trans_id: booking.id.toString(),
          amount,
          action: prepareAction,
          error: '0',
          error_note: '',
          sign_time: signTime,
          sign_string: prepareSignString,
        });

      expect(prepareResponse.body.error).toBe(0);

      // Complete
      const completeAction = '1';
      const completeSignString = generateSignature(
        clickTransId,
        booking.id.toString(),
        amount,
        completeAction,
        signTime
      );

      const completeResponse = await request(app)
        .post('/webhooks/click/complete')
        .send({
          click_trans_id: clickTransId,
          service_id: config.click.serviceId,
          click_paydoc_id: '123',
          merchant_trans_id: booking.id.toString(),
          merchant_prepare_id: prepareResponse.body.merchant_prepare_id.toString(),
          amount,
          action: completeAction,
          error: '0',
          error_note: '',
          sign_time: signTime,
          sign_string: completeSignString,
        });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.error).toBe(0);

      // Verify booking status
      const updatedBooking = bookingService.getBookingById(booking.id);
      expect(updatedBooking?.payment_status).toBe('paid');
    });
  });

  describe('Health Check', () => {
    it('should return OK status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Payment Success Page', () => {
    it('should return success page', async () => {
      const response = await request(app).get('/payment-success');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Payment Successful');
    });
  });
});
