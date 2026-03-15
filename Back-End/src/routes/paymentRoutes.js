import crypto from 'crypto';
import express from 'express';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { requireAuth } from '../middleware/adminMiddleware.js';

const router = express.Router();

function encodeVnpValue(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

function formatVnpDate(date = new Date()) {
  const vnDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const year = vnDate.getFullYear();
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getDate()).padStart(2, '0');
  const hour = String(vnDate.getHours()).padStart(2, '0');
  const minute = String(vnDate.getMinutes()).padStart(2, '0');
  const second = String(vnDate.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${second}`;
}

function buildSignData(params) {
  return Object.keys(params)
    .sort()
    .map(key => `${key}=${encodeVnpValue(params[key])}`)
    .join('&');
}

function buildQueryString(params) {
  return Object.keys(params)
    .sort()
    .map(key => `${key}=${encodeVnpValue(params[key])}`)
    .join('&');
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return (
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '127.0.0.1'
  );
}

router.post('/vnpay/create', requireAuth, async (req, res) => {
  try {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payments/vnpay/return';

    if (!tmnCode || !hashSecret) {
      return res.status(500).json({
        message: 'Missing VnPay configuration. Please set VNPAY_TMN_CODE and VNPAY_HASH_SECRET.',
      });
    }

    const orderId = String(req.body.orderId || '').trim();
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.currentUser.userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const amount = Number(order.totalAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const orderInfo = req.body.orderInfo || order.orderInfo || `Thanh toan don hang ${orderId}`;
    const orderType = req.body.orderType || 'other';
    const locale = req.body.language || 'vn';
    const bankCode = req.body.bankCode || '';
    const txnRef = `${order._id}-${Date.now()}`;
    const createDate = formatVnpDate();

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Amount: Math.round(amount * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: getClientIp(req),
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    const signData = buildSignData(vnpParams);
    const secureHash = crypto.createHmac('sha512', hashSecret).update(signData, 'utf-8').digest('hex');

    const paymentParams = {
      ...vnpParams,
      vnp_SecureHashType: 'SHA512',
      vnp_SecureHash: secureHash,
    };

    const paymentUrl = `${vnpUrl}?${buildQueryString(paymentParams)}`;

    order.orderInfo = orderInfo;
    order.payment = {
      ...(order.payment || {}),
      provider: 'vnpay',
      txnRef,
      requestedAt: new Date(),
    };
    order.status = 'pending';
    await order.save();

    res.status(200).json({
      message: 'Create VnPay payment URL successfully',
      paymentUrl,
      txnRef,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create VnPay payment URL', error: error.message });
  }
});

router.get('/vnpay/return', async (req, res) => {
  try {
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const frontendReturnUrl = process.env.FRONTEND_RETURN_URL || 'http://localhost:8080/dashboard.html';

    if (!hashSecret) {
      return res.status(500).json({ message: 'Missing VNPAY_HASH_SECRET configuration' });
    }

    const vnpParams = { ...req.query };
    const secureHash = vnpParams.vnp_SecureHash;

    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const signData = buildSignData(vnpParams);
    const signed = crypto.createHmac('sha512', hashSecret).update(signData, 'utf-8').digest('hex');
    const isValidSignature = secureHash === signed;

    const isSuccess = isValidSignature && vnpParams.vnp_ResponseCode === '00';
    const status = isSuccess ? 'success' : 'failed';
    const responseCode = vnpParams.vnp_ResponseCode || '99';
    const txnRef = vnpParams.vnp_TxnRef || '';

    if (txnRef) {
      const order = await Order.findOne({ 'payment.txnRef': txnRef });
      if (order) {
        order.status = isSuccess ? 'paid' : 'failed';
        order.payment = {
          ...(order.payment || {}),
          responseCode,
          returnedAt: new Date(),
          paidAt: isSuccess ? new Date() : null,
        };
        await order.save();

        if (isSuccess && order.source === 'cart') {
          await Cart.findOneAndUpdate(
            { user: order.user },
            { items: [] },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }
    }

    const redirectUrl = `${frontendReturnUrl}?paymentStatus=${status}&paymentCode=${responseCode}&txnRef=${encodeURIComponent(txnRef)}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify VnPay return payload', error: error.message });
  }
});

export default router;
