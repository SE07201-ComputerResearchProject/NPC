import express from 'express';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { requireAuth } from '../middleware/adminMiddleware.js';
import { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } from 'vnpay';

const router = express.Router();

function generatePayID() {
  const now = new Date();
  const timestamp = now.getTime();
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  return `PAY${timestamp}${seconds}${milliseconds}`;
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

    // Khởi tạo thư viện với SECRET KEY MỚI
    const vnpay = new VNPay({
      tmnCode: 'R44LG29E',
      secureSecret: 'KCQ84UBEE1XCJILCGK47N5YF5A6W3N6T', // <-- ĐÃ CẬP NHẬT MÃ MỚI
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
      vnp_ReturnUrl: 'http://localhost:3000/api/payments/vnpay/return',
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
    const frontendReturnUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    
    // Khởi tạo thư viện giống hệt hàm create với SECRET KEY MỚI
    const vnpay = new VNPay({
      tmnCode: 'R44LG29E',
      secureSecret: 'KCQ84UBEE1XCJILCGK47N5YF5A6W3N6T', // <-- ĐÃ CẬP NHẬT MÃ MỚI
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
      return res.redirect(`${frontendReturnUrl}/shopping-cart.html?paymentStatus=error&paymentCode=INVALID_SIGNATURE&txnRef=${encodeURIComponent(vnp_TxnRef)}`);
    }

    if (vnp_ResponseCode === '00') {
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

        if (order.source === 'cart') {
          await Cart.findOneAndUpdate({ user: order.user }, { items: [] }, { upsert: true });
        }
      }
      return res.redirect(`${frontendReturnUrl}/shopping-cart.html?paymentStatus=success&paymentCode=${vnp_ResponseCode}&txnRef=${encodeURIComponent(vnp_TxnRef)}`);
    } else {
      const order = await Order.findById(orderId);
      if (order) {
        order.status = 'failed';
        order.payment = { ...(order.payment || {}), responseCode: vnp_ResponseCode };
        await order.save();
      }
      return res.redirect(`${frontendReturnUrl}/shopping-cart.html?paymentStatus=failed&paymentCode=${vnp_ResponseCode}&txnRef=${encodeURIComponent(vnp_TxnRef)}`);
    }
  } catch (error) {
    console.error('VNPay return error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/shopping-cart.html?paymentStatus=error`);
  }
});

export default router;