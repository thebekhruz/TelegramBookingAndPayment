import crypto from 'crypto';
import { config } from '../config/config';
import { BookingService } from '../database/bookingService';

export interface PaymeTransaction {
  id: string;
  time: number;
  amount: number;
  account: {
    booking_id: string;
  };
  create_time: number;
  perform_time: number;
  cancel_time: number;
  transaction: string;
  state: number;
  reason?: number;
}

export class PaymeService {
  private bookingService: BookingService;

  constructor(bookingService: BookingService) {
    this.bookingService = bookingService;
  }

  /**
   * Generate payment URL for Payme
   */
  generatePaymentUrl(bookingId: number, amount: number): string {
    const params = {
      m: config.payme.merchantId,
      ac: { booking_id: bookingId.toString() },
      a: amount,
      c: `${config.webhookDomain}/webhooks/payme`,
    };

    const encodedParams = Buffer.from(JSON.stringify(params)).toString('base64');
    return `${config.payme.endpoint}/${encodedParams}`;
  }

  /**
   * Verify authorization header
   */
  verifyAuthorization(authHeader: string): boolean {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
    const expectedCredentials = `Paycom:${config.payme.secretKey}`;

    return credentials === expectedCredentials;
  }

  /**
   * Handle Payme JSON-RPC request
   */
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerformTransaction(params);
      case 'CreateTransaction':
        return this.createTransaction(params);
      case 'PerformTransaction':
        return this.performTransaction(params);
      case 'CancelTransaction':
        return this.cancelTransaction(params);
      case 'CheckTransaction':
        return this.checkTransaction(params);
      default:
        throw {
          code: -32601,
          message: 'Method not found',
        };
    }
  }

  private async checkPerformTransaction(params: any): Promise<any> {
    const bookingId = parseInt(params.account.booking_id);
    const booking = this.bookingService.getBookingById(bookingId);

    if (!booking) {
      throw {
        code: -31050,
        message: 'Booking not found',
      };
    }

    if (booking.payment_status === 'paid') {
      throw {
        code: -31051,
        message: 'Booking already paid',
      };
    }

    // Check if amount matches
    if (params.amount !== config.conference.ticketPrice) {
      throw {
        code: -31001,
        message: 'Invalid amount',
      };
    }

    return {
      allow: true,
    };
  }

  private async createTransaction(params: any): Promise<any> {
    const bookingId = parseInt(params.account.booking_id);
    const transactionId = params.id;

    // Check if transaction already exists
    const existingPayment = this.bookingService.getPaymentByTransactionId(transactionId);
    if (existingPayment) {
      return {
        create_time: new Date(existingPayment.created_at).getTime(),
        transaction: existingPayment.id.toString(),
        state: existingPayment.status === 'paid' ? 2 : 1,
      };
    }

    // Verify booking
    const booking = this.bookingService.getBookingById(bookingId);
    if (!booking) {
      throw {
        code: -31050,
        message: 'Booking not found',
      };
    }

    // Create payment record
    const payment = this.bookingService.createPayment(
      bookingId,
      'payme',
      transactionId,
      params.amount,
      { time: params.time }
    );

    return {
      create_time: new Date(payment.created_at).getTime(),
      transaction: payment.id.toString(),
      state: 1,
    };
  }

  private async performTransaction(params: any): Promise<any> {
    const transactionId = params.id;
    const payment = this.bookingService.getPaymentByTransactionId(transactionId);

    if (!payment) {
      throw {
        code: -31003,
        message: 'Transaction not found',
      };
    }

    // Update payment status
    this.bookingService.updatePaymentStatus(payment.id, 'paid');
    this.bookingService.updateBookingPaymentStatus(
      payment.booking_id,
      'paid',
      'payme',
      transactionId
    );

    return {
      transaction: payment.id.toString(),
      perform_time: Date.now(),
      state: 2,
    };
  }

  private async cancelTransaction(params: any): Promise<any> {
    const transactionId = params.id;
    const payment = this.bookingService.getPaymentByTransactionId(transactionId);

    if (!payment) {
      throw {
        code: -31003,
        message: 'Transaction not found',
      };
    }

    // Update payment status
    this.bookingService.updatePaymentStatus(payment.id, 'cancelled');
    this.bookingService.updateBookingPaymentStatus(
      payment.booking_id,
      'cancelled',
      'payme',
      transactionId
    );

    return {
      transaction: payment.id.toString(),
      cancel_time: Date.now(),
      state: -1,
    };
  }

  private async checkTransaction(params: any): Promise<any> {
    const transactionId = params.id;
    const payment = this.bookingService.getPaymentByTransactionId(transactionId);

    if (!payment) {
      throw {
        code: -31003,
        message: 'Transaction not found',
      };
    }

    const stateMap: Record<string, number> = {
      pending: 1,
      paid: 2,
      cancelled: -1,
      failed: -2,
    };

    return {
      create_time: new Date(payment.created_at).getTime(),
      perform_time: payment.status === 'paid' ? new Date(payment.updated_at).getTime() : 0,
      cancel_time: payment.status === 'cancelled' ? new Date(payment.updated_at).getTime() : 0,
      transaction: payment.id.toString(),
      state: stateMap[payment.status] || 1,
      reason: null,
    };
  }
}
