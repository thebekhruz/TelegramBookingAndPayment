import express, { Request, Response, NextFunction } from 'express';
import { PaymeService } from '../payments/payme';
import { ClickService } from '../payments/click';

export function setupWebhooks(
  app: express.Application,
  paymeService: PaymeService,
  clickService: ClickService
) {
  // Middleware to parse JSON and URL-encoded bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Payme webhook
  app.post('/webhooks/payme', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || '';

      // Verify authorization
      if (!paymeService.verifyAuthorization(authHeader)) {
        return res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32504,
            message: 'Unauthorized',
          },
          id: req.body.id,
        });
      }

      const { method, params, id } = req.body;

      try {
        const result = await paymeService.handleRequest(method, params);
        res.json({
          jsonrpc: '2.0',
          result,
          id,
        });
      } catch (error: any) {
        res.json({
          jsonrpc: '2.0',
          error: {
            code: error.code || -32400,
            message: error.message || 'Internal error',
          },
          id,
        });
      }
    } catch (error) {
      console.error('Payme webhook error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32400,
          message: 'Internal server error',
        },
        id: req.body.id,
      });
    }
  });

  // Click prepare webhook
  app.post('/webhooks/click/prepare', async (req: Request, res: Response) => {
    try {
      const result = await clickService.handlePrepare(req.body);
      res.json(result);
    } catch (error) {
      console.error('Click prepare error:', error);
      res.json({
        error: -9,
        error_note: 'Internal server error',
      });
    }
  });

  // Click complete webhook
  app.post('/webhooks/click/complete', async (req: Request, res: Response) => {
    try {
      const result = await clickService.handleComplete(req.body);
      res.json(result);
    } catch (error) {
      console.error('Click complete error:', error);
      res.json({
        error: -9,
        error_note: 'Internal server error',
      });
    }
  });

  // Payment success redirect (optional, for UX)
  app.get('/payment-success', (req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 400px;
          }
          .success-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            line-height: 1.6;
          }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s;
          }
          .btn:hover {
            background: #5568d3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Payment Successful!</h1>
          <p>Your conference ticket has been booked successfully. You will receive a confirmation message in the Telegram bot.</p>
          <p>Use the /mybooking command in the bot to view your booking details.</p>
          <a href="https://t.me/your_bot" class="btn">Back to Bot</a>
        </div>
      </body>
      </html>
    `);
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
      error: 'Internal server error',
    });
  });
}
