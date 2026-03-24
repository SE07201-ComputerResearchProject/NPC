import express from 'express';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { requireAuth } from '../middleware/adminMiddleware.js';
import { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } from 'vnpay';

const router = express.Router();

// Generate unique payment ID
function generatePayID() {
  const now = new Date();
  const timestamp = now.getTime();
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  return `PAY${timestamp}${seconds}${milliseconds}`;
}

// VNPay routes
router.post('/vnpay/create', requireAuth, async (req, res) => {
  try {
    const orderId = String(req.body.orderId || '').trim();
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.currentUser.userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const amountValue = Number(order.totalAmount || 0);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Initialize VNPay with your credentials
    const vnpay = new VNPay({
      tmnCode: 'R44LG29E',
      secureSecret: 'EDY6RULT0QS7V5OJBB6CD4ATSZUAFQTP',
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
      hashAlgorithm: 'SHA512',
      enableLog: true,
      loggerFn: ignoreLogger,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const txnRef = `${orderId}_${generatePayID()}`;

    // Build payment URL using the library
    const vnpayResponse = vnpay.buildPaymentUrl({
      vnp_Amount: amountValue,
      vnp_IpAddr: req.ip || '127.0.0.1',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: 'http://localhost:3000/api/payments/vnpay/return',
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    });

    // Save order with pending status
    order.payment = {
      ...(order.payment || {}),
      provider: 'vnpay',
      txnRef: txnRef,
      requestedAt: new Date(),
    };
    order.status = 'pending';
    await order.save();

    res.status(200).json({
      message: 'Create VNPay payment URL successfully',
      metadata: vnpayResponse,
    });
  } catch (error) {
    console.error('VNPay create error:', error);
    res.status(500).json({ 
      message: 'Failed to create VNPay payment URL', 
      error: error.message 
    });
  }
});

router.get('/vnpay/return', async (req, res) => {
  try {
    // Initialize VNPay for verification
    const vnpay = new VNPay({
      tmnCode: 'R44LG29E',
      secureSecret: 'EDY6RULT0QS7V5OJBB6CD4ATSZUAFQTP',
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
      hashAlgorithm: 'SHA512',
      enableLog: true,
      loggerFn: ignoreLogger,
    });

    // Verify the return URL using the library's method
    const verify = vnpay.verifyReturnUrl(req.query);
    
    const frontendReturnUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const vnp_TxnRef = String(req.query.vnp_TxnRef || '');
    const vnp_ResponseCode = String(req.query.vnp_ResponseCode || '99');
    
    // Extract orderId from txnRef (format: orderId_PAYXXXX)
    const orderId = vnp_TxnRef ? vnp_TxnRef.split('_')[0] : '';

    if (!verify.isSuccess) {
      // Invalid signature
      console.error('Invalid VNPay signature');
      const redirectUrl = `${frontendReturnUrl}/shopping-cart.html?paymentStatus=error&paymentCode=INVALID_SIGNATURE&txnRef=${encodeURIComponent(vnp_TxnRef)}`;
      return res.redirect(redirectUrl);
    }

    if (vnp_ResponseCode === '00') {
      // Payment successful
      const order = await Order.findById(orderId);
      if (order) {
        order.status = 'paid';
        order.payment = {
          ...(order.payment || {}),
          provider: 'vnpay',
          responseCode: vnp_ResponseCode,
          paidAt: new Date(),
        };
        await order.save();

        // Clear cart if order from cart source
        if (order.source === 'cart') {
          await Cart.findOneAndUpdate(
            { user: order.user },
            { items: [] },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }

      const redirectUrl = `${frontendReturnUrl}/shopping-cart.html?paymentStatus=success&paymentCode=${vnp_ResponseCode}&txnRef=${encodeURIComponent(vnp_TxnRef)}`;
      return res.redirect(redirectUrl);
    } else {
      // Payment failed or cancelled
      const order = await Order.findById(orderId);
      if (order) {
        order.status = 'failed';
        order.payment = {
          ...(order.payment || {}),
          responseCode: vnp_ResponseCode,
        };
        await order.save();
      }

      const redirectUrl = `${frontendReturnUrl}/shopping-cart.html?paymentStatus=failed&paymentCode=${vnp_ResponseCode}&txnRef=${encodeURIComponent(vnp_TxnRef)}`;
      return res.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('VNPay return error:', error);
    const frontendReturnUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendReturnUrl}/shopping-cart.html?paymentStatus=error`;
    return res.redirect(redirectUrl);
  }
});

export default router;
