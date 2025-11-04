import crypto from 'crypto';
import { config } from '../config/config';
import { BookingService } from '../database/bookingService';

export interface ClickPrepareParams {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id: string;
  merchant_trans_id: string;
  amount: string;
  action: string;
  error: string;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

export interface ClickCompleteParams {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id: string;
  merchant_trans_id: string;
  merchant_prepare_id: string;
  amount: string;
  action: string;
  error: string;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

export class ClickService {
  private bookingService: BookingService;

  constructor(bookingService: BookingService) {
    this.bookingService = bookingService;
  }

  /**
   * Generate payment URL for Click
   */
  generatePaymentUrl(bookingId: number, amount: number): string {
    const params = new URLSearchParams({
      service_id: config.click.serviceId,
      merchant_id: config.click.merchantId,
      merchant_user_id: config.click.merchantUserId,
      amount: amount.toString(),
      transaction_param: bookingId.toString(),
      return_url: `${config.webhookDomain}/payment-success`,
    });

    return `https://my.click.uz/services/pay?${params.toString()}`;
  }

  /**
   * Verify signature for Click requests
   */
  verifySignature(
    clickTransId: string,
    serviceId: string,
    secretKey: string,
    merchantTransId: string,
    amount: string,
    action: string,
    signTime: string,
    signString: string
  ): boolean {
    const signData = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${amount}${action}${signTime}`;
    const hash = crypto.createHash('md5').update(signData).digest('hex');
    return hash === signString;
  }

  /**
   * Handle Click prepare request (step 1)
   */
  async handlePrepare(params: ClickPrepareParams): Promise<any> {
    // Verify signature
    const isValid = this.verifySignature(
      params.click_trans_id,
      params.service_id,
      config.click.secretKey,
      params.merchant_trans_id,
      params.amount,
      params.action,
      params.sign_time,
      params.sign_string
    );

    if (!isValid) {
      return {
        error: -1,
        error_note: 'Invalid signature',
      };
    }

    // Check if already processed
    const existingPayment = this.bookingService.getPaymentByTransactionId(params.click_trans_id);
    if (existingPayment) {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        merchant_prepare_id: existingPayment.id,
        error: 0,
        error_note: 'Success',
      };
    }

    const bookingId = parseInt(params.merchant_trans_id);
    const booking = this.bookingService.getBookingById(bookingId);

    if (!booking) {
      return {
        error: -5,
        error_note: 'Booking not found',
      };
    }

    if (booking.payment_status === 'paid') {
      return {
        error: -4,
        error_note: 'Already paid',
      };
    }

    // Verify amount
    const amountInTiyin = parseFloat(params.amount) * 100; // Click sends in sum, we store in tiyin
    if (Math.abs(amountInTiyin - config.conference.ticketPrice) > 1) {
      return {
        error: -2,
        error_note: 'Invalid amount',
      };
    }

    // Create payment record
    const payment = this.bookingService.createPayment(
      bookingId,
      'click',
      params.click_trans_id,
      config.conference.ticketPrice,
      {
        click_paydoc_id: params.click_paydoc_id,
        sign_time: params.sign_time,
      }
    );

    return {
      click_trans_id: params.click_trans_id,
      merchant_trans_id: params.merchant_trans_id,
      merchant_prepare_id: payment.id,
      error: 0,
      error_note: 'Success',
    };
  }

  /**
   * Handle Click complete request (step 2)
   */
  async handleComplete(params: ClickCompleteParams): Promise<any> {
    // Verify signature
    const isValid = this.verifySignature(
      params.click_trans_id,
      params.service_id,
      config.click.secretKey,
      params.merchant_trans_id,
      params.amount,
      params.action,
      params.sign_time,
      params.sign_string
    );

    if (!isValid) {
      return {
        error: -1,
        error_note: 'Invalid signature',
      };
    }

    const payment = this.bookingService.getPaymentByTransactionId(params.click_trans_id);

    if (!payment) {
      return {
        error: -6,
        error_note: 'Transaction not found',
      };
    }

    if (payment.id !== parseInt(params.merchant_prepare_id)) {
      return {
        error: -6,
        error_note: 'Invalid prepare ID',
      };
    }

    // Check if already completed
    if (payment.status === 'paid') {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        merchant_confirm_id: payment.id,
        error: 0,
        error_note: 'Success',
      };
    }

    // Update payment and booking status
    this.bookingService.updatePaymentStatus(payment.id, 'paid');
    this.bookingService.updateBookingPaymentStatus(
      payment.booking_id,
      'paid',
      'click',
      params.click_trans_id
    );

    return {
      click_trans_id: params.click_trans_id,
      merchant_trans_id: params.merchant_trans_id,
      merchant_confirm_id: payment.id,
      error: 0,
      error_note: 'Success',
    };
  }

  /**
   * Handle payment errors
   */
  async handleError(params: any): Promise<any> {
    if (params.click_trans_id) {
      const payment = this.bookingService.getPaymentByTransactionId(params.click_trans_id);
      if (payment) {
        this.bookingService.updatePaymentStatus(payment.id, 'failed');
        this.bookingService.updateBookingPaymentStatus(
          payment.booking_id,
          'failed',
          'click',
          params.click_trans_id
        );
      }
    }

    return {
      error: parseInt(params.error) || -9,
      error_note: params.error_note || 'Transaction failed',
    };
  }
}
