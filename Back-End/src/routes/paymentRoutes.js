import crypto from 'crypto';
import express from 'express';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { requireAuth } from '../middleware/adminMiddleware.js';

const router = express.Router();

function signMoMoData(rawData, secretKey) {
  return crypto.createHmac('sha256', secretKey).update(rawData, 'utf8').digest('hex');
}

function buildMoMoReturnSignatureSource(query = {}) {
  return Object.keys(query)
    .filter(key => key !== 'signature' && query[key] !== undefined)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
}

router.post('/momo/create', requireAuth, async (req, res) => {
  try {
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const momoApiUrl = process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';
    const returnUrl = process.env.MOMO_RETURN_URL || 'http://localhost:3000/api/payments/momo/return';
    const ipnUrl = process.env.MOMO_IPN_URL || returnUrl;
    const requestType = process.env.MOMO_REQUEST_TYPE || 'captureWallet';

    if (!partnerCode || !accessKey || !secretKey) {
      return res.status(500).json({
        message: 'Missing MoMo configuration. Please set MOMO_PARTNER_CODE, MOMO_ACCESS_KEY and MOMO_SECRET_KEY.',
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

    const amountValue = Math.round(Number(order.totalAmount || 0));
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const orderInfo = req.body.orderInfo || order.orderInfo || `Thanh toan don hang ${orderId}`;
    const momoOrderId = `${order._id}-${Date.now()}`;
    const requestId = `${order._id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const extraData = String(req.body.extraData || '');
    const amount = String(amountValue);

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = signMoMoData(rawSignature, secretKey);

    const momoPayload = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId: momoOrderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      extraData,
      signature,
    };

    const momoResponseRaw = await fetch(momoApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(momoPayload),
    });
    const momoResponse = await momoResponseRaw.json().catch(() => ({}));

    if (!momoResponseRaw.ok || !momoResponse?.payUrl) {
      return res.status(502).json({
        message: momoResponse?.message || 'Failed to create MoMo payment URL',
      });
    }

    order.orderInfo = orderInfo;
    order.payment = {
      ...(order.payment || {}),
      provider: 'momo',
      txnRef: momoOrderId,
      responseCode: String(momoResponse?.resultCode ?? ''),
      requestedAt: new Date(),
    };
    order.status = 'pending';
    await order.save();

    res.status(200).json({
      message: 'Create MoMo payment URL successfully',
      paymentUrl: momoResponse.payUrl,
      txnRef: momoOrderId,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create MoMo payment URL', error: error.message });
  }
});

router.get('/momo/return', async (req, res) => {
  try {
    const secretKey = process.env.MOMO_SECRET_KEY || '';
    const frontendReturnUrl = process.env.FRONTEND_RETURN_URL || 'http://localhost:8080/dashboard.html';

    const momoParams = { ...req.query };
    const signature = String(momoParams.signature || '');
    const responseCode = String(momoParams.resultCode || '99');
    const txnRef = String(momoParams.orderId || '');

    let isValidSignature = true;
    if (secretKey && signature) {
      const raw = buildMoMoReturnSignatureSource(momoParams);
      const expected = signMoMoData(raw, secretKey);
      isValidSignature = expected === signature;
    }

    const isSuccess = isValidSignature && responseCode === '0';
    const status = isSuccess ? 'success' : 'failed';

    if (txnRef) {
      const order = await Order.findOne({ 'payment.txnRef': txnRef });
      if (order) {
        order.status = isSuccess ? 'paid' : 'failed';
        order.payment = {
          ...(order.payment || {}),
          provider: 'momo',
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
    res.status(500).json({ message: 'Failed to verify MoMo return payload', error: error.message });
  }
});

export default router;
