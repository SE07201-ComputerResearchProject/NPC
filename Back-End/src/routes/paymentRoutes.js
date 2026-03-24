import express from 'express';
import Cart from '../models/Cart.js';
import Log from '../models/Log.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/adminMiddleware.js';
import { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } from 'vnpay';
import path from 'path';

const router = express.Router();

function generatePayID() {
  const now = new Date();
  const timestamp = now.getTime();
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  return `PAY${timestamp}${seconds}${milliseconds}`;
}

function getFrontendBaseUrl() {
  const explicitUrl = String(process.env.FRONTEND_URL || '').trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, '');
  }

  const returnUrl = String(process.env.FRONTEND_RETURN_URL || '').trim();
  if (returnUrl) {
    try {
      const parsed = new URL(returnUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // Fall through to default static frontend URL.
    }
  }

  return 'http://localhost:3000';
}

function getVnpayReturnUrl() {
  return String(process.env.VNPAY_RETURN_URL || 'http://localhost:3001/api/payments/vnpay/return').trim();
}

function normalizeBasePath(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '/') return '';
  const ensured = raw.startsWith('/') ? raw : `/${raw}`;
  return ensured.replace(/\/$/, '');
}

function getFrontendBasePath() {
  const explicitBasePath = normalizeBasePath(process.env.FRONTEND_BASE_PATH || '');
  if (explicitBasePath) {
    return explicitBasePath;
  }

  const returnUrl = String(process.env.FRONTEND_RETURN_URL || '').trim();
  if (returnUrl) {
    try {
      const parsed = new URL(returnUrl);
      const dirName = path.posix.dirname(parsed.pathname || '/');
      return normalizeBasePath(dirName);
    } catch {
      // Fall through to root.
    }
  }

  return '';
}

function getFrontendPageUrl(pageName) {
  return `${getFrontendBaseUrl()}${getFrontendBasePath()}/${pageName}`;
}

async function resolveOrderUserEmail(order) {
  if (!order?.user) return 'unknown-user';

  try {
    const user = await User.findById(order.user).select('email').lean();
    return String(user?.email || 'unknown-user');
  } catch {
    return 'unknown-user';
  }
}

async function writePaymentLog(user, activity) {
  try {
    await Log.create({ user, activity });
  } catch {
    // Payment result must not fail because of logging.
  }
}

router.post('/vnpay/create', requireAuth, async (req, res) => {
  try {
    const orderId = String(req.body.orderId || '').trim();
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await Order.findOne({ _id: orderId, user: req.currentUser.userId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const amountValue = Number(order.totalAmount || 0);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Xử lý IP gọn gàng nhất
    let ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    ipAddr = ipAddr.toString().split(',')[0].trim().replace('::ffff:', '');
    if (ipAddr === '::1' || !ipAddr) ipAddr = '127.0.0.1';

    // VIỆC QUAN TRỌNG: Loại bỏ hoàn toàn dấu cách (space) trong OrderInfo
    const safeOrderInfo = `ThanhToanDonHang_${orderId}`.replace(/[^a-zA-Z0-9_]/g, "");

    // Khởi tạo thư viện với SECRET KEY CHUẨN
    const vnpay = new VNPay({
      tmnCode: 'R44LG29E',
      secureSecret: 'KCQ84UBEE1XCJILCGK47N5YF5A6W3N6T',
      testMode: true,
      hashAlgorithm: 'SHA512',
      enableLog: true,
      loggerFn: ignoreLogger,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const txnRef = `${orderId}_${generatePayID()}`;

    // Tạo URL
    const vnpayResponse = vnpay.buildPaymentUrl({
      vnp_Amount: Math.round(amountValue), // Thư viện sẽ tự nhân 100 ngầm
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: safeOrderInfo,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: getVnpayReturnUrl(),
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    });

    // Cập nhật DB
    order.payment = {
      ...(order.payment || {}),
      provider: 'vnpay',
      txnRef: txnRef,
      requestedAt: new Date(),
    };
    order.status = 'pending';
    await order.save();

    await writePaymentLog(
      String(req.currentUser?.email || 'unknown-user'),
      `VNPay payment initiated for order ${orderId} with txnRef ${txnRef}`
    );

    res.status(200).json({
      message: 'Create VNPay payment URL successfully',
      metadata: vnpayResponse,
    });
  } catch (error) {
    console.error('VNPay create error:', error);
    res.status(500).json({ message: 'Failed to create VNPay URL', error: error.message });
  }
});

router.get('/vnpay/return', async (req, res) => {
  try {
    const successPageUrl = getFrontendPageUrl('payment-success.html');
    const failedPageUrl = getFrontendPageUrl('payment-failed.html');
    
    // Khởi tạo thư viện giống hệt hàm create
    const vnpay = new VNPay({
      tmnCode: 'R44LG29E',
      secureSecret: 'KCQ84UBEE1XCJILCGK47N5YF5A6W3N6T',
      testMode: true,
      hashAlgorithm: 'SHA512',
      enableLog: true,
      loggerFn: ignoreLogger,
    });

    const verify = vnpay.verifyReturnUrl(req.query);
    const vnp_TxnRef = String(req.query.vnp_TxnRef || '');
    const vnp_ResponseCode = String(req.query.vnp_ResponseCode || '99');
    const orderId = vnp_TxnRef ? vnp_TxnRef.split('_')[0] : '';

    if (!verify.isSuccess) {
      console.error('Invalid VNPay signature');
      await writePaymentLog('system', `VNPay return rejected due to invalid signature for txnRef ${vnp_TxnRef || 'unknown'}`);
      return res.redirect(`${failedPageUrl}?orderId=${encodeURIComponent(orderId)}&paymentCode=INVALID_SIGNATURE&txnRef=${encodeURIComponent(vnp_TxnRef)}&reason=${encodeURIComponent('Invalid VNPay signature')}`);
    }

    if (vnp_ResponseCode === '00') {
      const order = await Order.findById(orderId);
      if (order) {
        const userEmail = await resolveOrderUserEmail(order);
        order.status = 'paid';
        order.payment = {
          ...(order.payment || {}),
          provider: 'vnpay',
          responseCode: vnp_ResponseCode,
          paidAt: new Date(),
          returnedAt: new Date(),
        };
        await order.save();

        await writePaymentLog(
          userEmail,
          `VNPay payment succeeded for order ${orderId} with txnRef ${vnp_TxnRef}`
        );

        if (order.source === 'cart') {
          await Cart.findOneAndUpdate({ user: order.user }, { items: [] }, { upsert: true });
        }
      }
      return res.redirect(`${successPageUrl}?orderId=${encodeURIComponent(orderId)}&paymentCode=${encodeURIComponent(vnp_ResponseCode)}&txnRef=${encodeURIComponent(vnp_TxnRef)}`);
    } else {
      const order = await Order.findById(orderId);
      if (order) {
        const userEmail = await resolveOrderUserEmail(order);
        order.status = 'failed';
        order.payment = {
          ...(order.payment || {}),
          responseCode: vnp_ResponseCode,
          returnedAt: new Date(),
        };
        await order.save();
        await writePaymentLog(
          userEmail,
          `VNPay payment failed for order ${orderId} with response code ${vnp_ResponseCode}`
        );
      }
      return res.redirect(`${failedPageUrl}?orderId=${encodeURIComponent(orderId)}&paymentCode=${encodeURIComponent(vnp_ResponseCode)}&txnRef=${encodeURIComponent(vnp_TxnRef)}&reason=${encodeURIComponent('Payment was declined or cancelled')}`);
    }
  } catch (error) {
    console.error('VNPay return error:', error);
    await writePaymentLog('system', `VNPay return handler error: ${error.message}`);
    return res.redirect(`${getFrontendPageUrl('payment-failed.html')}?paymentCode=ERROR&reason=${encodeURIComponent(error.message || 'Unhandled payment return error')}`);
  }
});

export default router;