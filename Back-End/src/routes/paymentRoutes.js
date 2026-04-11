import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import Cart from '../models/Cart.js';
import Log from '../models/Log.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Voucher from '../models/Voucher.js';
import { requireAuth } from '../middleware/adminMiddleware.js';

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

  return 'http://127.0.0.1:3000';
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

function getMoMoConfig() {
  return {
    partnerCode: String(process.env.MOMO_PARTNER_CODE || '').trim(),
    accessKey: String(process.env.MOMO_ACCESS_KEY || '').trim(),
    secretKey: String(process.env.MOMO_SECRET_KEY || '').trim(),
    endpoint: String(process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create').trim(),
    requestType: String(process.env.MOMO_REQUEST_TYPE || 'captureWallet').trim(),
    redirectUrl: String(process.env.MOMO_REDIRECT_URL || 'http://127.0.0.1:3001/api/payments/momo/return').trim(),
    ipnUrl: String(process.env.MOMO_IPN_URL || 'http://127.0.0.1:3001/api/payments/momo/ipn').trim(),
  };
}

function assertMoMoConfig() {
  const config = getMoMoConfig();
  if (!config.partnerCode || !config.accessKey || !config.secretKey) {
    throw new Error('Missing MoMo configuration. Set MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, and MOMO_SECRET_KEY.');
  }

  return config;
}

function signMoMoPayload(rawSignature, secretKey) {
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function buildMoMoCreateSignature({
  accessKey,
  amount,
  extraData,
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType,
}) {
  return [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join('&');
}

function buildMoMoCallbackSignature(payload) {
  return [
    `amount=${String(payload.amount || '')}`,
    `extraData=${String(payload.extraData || '')}`,
    `message=${String(payload.message || '')}`,
    `orderId=${String(payload.orderId || '')}`,
    `orderInfo=${String(payload.orderInfo || '')}`,
    `orderType=${String(payload.orderType || '')}`,
    `partnerCode=${String(payload.partnerCode || '')}`,
    `payType=${String(payload.payType || '')}`,
    `requestId=${String(payload.requestId || '')}`,
    `responseTime=${String(payload.responseTime || '')}`,
    `resultCode=${String(payload.resultCode || '')}`,
    `transId=${String(payload.transId || '')}`,
  ].join('&');
}

function verifyMoMoCallbackSignature(payload, secretKey) {
  const providedSignature = String(payload.signature || '').trim();
  if (!providedSignature) {
    return false;
  }

  const rawSignature = buildMoMoCallbackSignature(payload);
  const expectedSignature = signMoMoPayload(rawSignature, secretKey);
  return timingSafeEqual(expectedSignature, providedSignature);
}

function extractInternalOrderId(paymentOrderId, extraData) {
  const rawOrderId = String(paymentOrderId || '').trim();
  if (rawOrderId.includes('_')) {
    return rawOrderId.split('_')[0];
  }

  const encodedExtraData = String(extraData || '').trim();
  if (!encodedExtraData) {
    return rawOrderId;
  }

  try {
    const decoded = JSON.parse(Buffer.from(encodedExtraData, 'base64').toString('utf8'));
    return String(decoded?.internalOrderId || rawOrderId).trim();
  } catch {
    return rawOrderId;
  }
}

function buildReturnUrl(pageUrl, params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  return queryString ? `${pageUrl}?${queryString}` : pageUrl;
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

function isValidOrderId(orderId) {
  return mongoose.Types.ObjectId.isValid(orderId);
}

async function markOrderPaymentFailed(orderId, {
  responseCode = 'FAILED',
  txnRef = '',
  provider = 'momo',
  reason = '',
} = {}) {
  if (!isValidOrderId(orderId)) {
    return null;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return null;
  }

  const nextTxnRef = txnRef || order.payment?.txnRef || '';
  const alreadyFailed =
    order.status === 'failed' &&
    String(order.payment?.responseCode || '') === String(responseCode) &&
    String(order.payment?.txnRef || '') === String(nextTxnRef);

  if (alreadyFailed) {
    return order;
  }

  order.status = 'failed';
  order.payment = {
    ...(order.payment || {}),
    provider: provider || order.payment?.provider || 'momo',
    txnRef: nextTxnRef,
    responseCode,
    returnedAt: new Date(),
  };
  await order.save();

  const userEmail = await resolveOrderUserEmail(order);
  const details = reason ? ` (${reason})` : '';
  await writePaymentLog(
    userEmail,
    `MoMo payment failed for order ${orderId} with response code ${responseCode}${details}`
  );

  return order;
}

async function markOrderPaymentPaid(orderId, {
  responseCode = '0',
  txnRef = '',
  provider = 'momo',
} = {}) {
  if (!isValidOrderId(orderId)) {
    return null;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return null;
  }

  const nextTxnRef = txnRef || order.payment?.txnRef || '';
  const alreadyPaid =
    order.status === 'paid' &&
    String(order.payment?.responseCode || '') === String(responseCode) &&
    String(order.payment?.txnRef || '') === String(nextTxnRef);

  if (alreadyPaid) {
    return order;
  }

  const wasPaid = order.status === 'paid';
  order.status = 'paid';
  order.payment = {
    ...(order.payment || {}),
    provider: provider || order.payment?.provider || 'momo',
    txnRef: nextTxnRef,
    responseCode,
    paidAt: order.payment?.paidAt || new Date(),
    returnedAt: new Date(),
  };
  await order.save();

  const userEmail = await resolveOrderUserEmail(order);
  await writePaymentLog(
    userEmail,
    `MoMo payment succeeded for order ${orderId} with txnRef ${nextTxnRef}`
  );

  if (!wasPaid) {
    const voucherCode = String(order?.voucher?.code || '').trim().toUpperCase();
    if (voucherCode) {
      await Voucher.updateOne({ code: voucherCode }, { $inc: { usedCount: 1 } }).catch(() => {
        // Voucher usage tracking is non-critical for payment completion.
      });
    }
  }

  if (!wasPaid && order.source === 'cart') {
    await Cart.findOneAndUpdate({ user: order.user }, { items: [] }, { upsert: true });
  }

  return order;
}

async function tryMarkPaidFromUnverifiedReturn(orderId, txnRef) {
  if (!isValidOrderId(orderId)) {
    return false;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return false;
  }

  const expectedTxnRef = String(order.payment?.txnRef || '').trim();
  const incomingTxnRef = String(txnRef || '').trim();
  if (!expectedTxnRef || !incomingTxnRef || expectedTxnRef !== incomingTxnRef) {
    return false;
  }

  if (order.status === 'paid') {
    return true;
  }

  await markOrderPaymentPaid(orderId, {
    responseCode: '0',
    txnRef: incomingTxnRef,
    provider: 'momo',
  });

  return true;
}

router.post('/momo/create', requireAuth, async (req, res) => {
  try {
    const config = assertMoMoConfig();
    const orderId = String(req.body.orderId || '').trim();
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });
    if (!isValidOrderId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.currentUser.userId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const amountValue = Math.round(Number(order.totalAmount || 0));
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const requestId = generatePayID();
    const momoOrderId = `${orderId}_${generatePayID()}`;
    const orderInfo = String(order.orderInfo || req.body.orderInfo || `Thanh toan don hang ${orderId}`).trim();
    const extraData = Buffer.from(
      JSON.stringify({
        internalOrderId: orderId,
        source: order.source || '',
      })
    ).toString('base64');

    const rawSignature = buildMoMoCreateSignature({
      accessKey: config.accessKey,
      amount: String(amountValue),
      extraData,
      ipnUrl: config.ipnUrl,
      orderId: momoOrderId,
      orderInfo,
      partnerCode: config.partnerCode,
      redirectUrl: config.redirectUrl,
      requestId,
      requestType: config.requestType,
    });

    const signature = signMoMoPayload(rawSignature, config.secretKey);
    const payload = {
      partnerCode: config.partnerCode,
      partnerName: 'NPC',
      storeId: 'NPCStore',
      requestId,
      amount: String(amountValue),
      orderId: momoOrderId,
      orderInfo,
      redirectUrl: config.redirectUrl,
      ipnUrl: config.ipnUrl,
      lang: 'vi',
      requestType: config.requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    const momoResponse = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await momoResponse.json().catch(() => ({}));
    if (!momoResponse.ok || Number(responseData?.resultCode) !== 0 || !responseData?.payUrl) {
      const errorMessage = responseData?.message || 'Failed to create MoMo payment URL';
      await writePaymentLog(
        String(req.currentUser?.email || 'unknown-user'),
        `MoMo create request failed for order ${orderId}: ${errorMessage}`
      );
      return res.status(502).json({ message: errorMessage, detail: responseData });
    }

    order.payment = {
      ...(order.payment || {}),
      provider: 'momo',
      txnRef: momoOrderId,
      responseCode: '',
      requestedAt: new Date(),
    };
    order.status = 'pending';
    await order.save();

    await writePaymentLog(
      String(req.currentUser?.email || 'unknown-user'),
      `MoMo payment initiated for order ${orderId} with txnRef ${momoOrderId}`
    );

    res.status(200).json({
      message: 'Create MoMo payment URL successfully',
      metadata: responseData.payUrl,
      provider: 'momo',
    });
  } catch (error) {
    console.error('MoMo create error:', error);
    res.status(500).json({ message: 'Failed to create MoMo URL', error: error.message });
  }
});

router.get('/momo/return', async (req, res) => {
  const successPageUrl = getFrontendPageUrl('payment-success.html');
  const failedPageUrl = getFrontendPageUrl('payment-failed.html');

  try {
    const config = assertMoMoConfig();
    const paymentOrderId = String(req.query.orderId || '').trim();
    const internalOrderId = extractInternalOrderId(paymentOrderId, req.query.extraData);
    const paymentCode = String(req.query.resultCode || '99');
    const reason = String(req.query.message || '').trim();
    const isSignatureValid = verifyMoMoCallbackSignature(req.query, config.secretKey);

    if (!isSignatureValid) {
      await writePaymentLog(
        'system',
        `MoMo return signature mismatch for txnRef ${paymentOrderId || 'unknown'} with resultCode ${paymentCode}`
      );

      // Browser return can be tampered with or incomplete. However, some environments
      // may miss IPN callbacks, so we apply a guarded fallback for successful returns.
      if (paymentCode === '0') {
        const fallbackApplied = await tryMarkPaidFromUnverifiedReturn(internalOrderId, paymentOrderId);
        if (fallbackApplied) {
          await writePaymentLog(
            'system',
            `MoMo return fallback marked order ${internalOrderId} as paid (signature mismatch, txnRef matched)`
          );
        }

        return res.redirect(buildReturnUrl(successPageUrl, {
          orderId: internalOrderId,
          paymentCode,
          txnRef: paymentOrderId,
          verification: fallbackApplied ? 'unverified_fallback' : 'pending',
        }));
      }

      return res.redirect(buildReturnUrl(failedPageUrl, {
        orderId: internalOrderId,
        paymentCode: paymentCode || 'INVALID_SIGNATURE',
        txnRef: paymentOrderId,
        reason: reason || 'Payment verification failed',
      }));
    }

    if (!isValidOrderId(internalOrderId)) {
      await writePaymentLog('system', `MoMo return rejected due to invalid order ID for txnRef ${paymentOrderId || 'unknown'}`);
      return res.redirect(buildReturnUrl(failedPageUrl, {
        orderId: internalOrderId,
        paymentCode: 'INVALID_ORDER_ID',
        txnRef: paymentOrderId,
        reason: 'Invalid order ID',
      }));
    }

    if (paymentCode === '0') {
      await markOrderPaymentPaid(internalOrderId, {
        responseCode: paymentCode,
        txnRef: paymentOrderId,
      });
      return res.redirect(buildReturnUrl(successPageUrl, {
        orderId: internalOrderId,
        paymentCode,
        txnRef: paymentOrderId,
      }));
    }

    await markOrderPaymentFailed(internalOrderId, {
      responseCode: paymentCode,
      txnRef: paymentOrderId,
      reason: reason || 'Payment was declined or cancelled',
    });
    return res.redirect(buildReturnUrl(failedPageUrl, {
      orderId: internalOrderId,
      paymentCode,
      txnRef: paymentOrderId,
      reason: reason || 'Payment was declined or cancelled',
    }));
  } catch (error) {
    console.error('MoMo return error:', error);
    const paymentOrderId = String(req.query.orderId || '').trim();
    const internalOrderId = extractInternalOrderId(paymentOrderId, req.query.extraData);
    await markOrderPaymentFailed(internalOrderId, {
      responseCode: 'ERROR',
      txnRef: paymentOrderId,
      reason: error.message || 'Unhandled payment return error',
    });
    await writePaymentLog('system', `MoMo return handler error: ${error.message}`);
    return res.redirect(buildReturnUrl(failedPageUrl, {
      orderId: internalOrderId,
      paymentCode: 'ERROR',
      txnRef: paymentOrderId,
      reason: error.message || 'Unhandled payment return error',
    }));
  }
});

router.post('/momo/ipn', async (req, res) => {
  try {
    const config = assertMoMoConfig();
    const paymentOrderId = String(req.body.orderId || '').trim();
    const internalOrderId = extractInternalOrderId(paymentOrderId, req.body.extraData);
    const paymentCode = String(req.body.resultCode || '99');
    const reason = String(req.body.message || '').trim();

    if (!verifyMoMoCallbackSignature(req.body, config.secretKey)) {
      await writePaymentLog('system', `MoMo IPN rejected due to invalid signature for txnRef ${paymentOrderId || 'unknown'}`);
      return res.status(400).json({ resultCode: 97, message: 'Invalid signature' });
    }

    if (!isValidOrderId(internalOrderId)) {
      await writePaymentLog('system', `MoMo IPN rejected due to invalid order ID for txnRef ${paymentOrderId || 'unknown'}`);
      return res.status(400).json({ resultCode: 99, message: 'Invalid order ID' });
    }

    if (paymentCode === '0') {
      await markOrderPaymentPaid(internalOrderId, {
        responseCode: paymentCode,
        txnRef: paymentOrderId,
      });
    } else {
      await markOrderPaymentFailed(internalOrderId, {
        responseCode: paymentCode,
        txnRef: paymentOrderId,
        reason: reason || 'Payment was declined or cancelled',
      });
    }

    return res.status(200).json({ resultCode: 0, message: 'Success' });
  } catch (error) {
    console.error('MoMo IPN error:', error);
    await writePaymentLog('system', `MoMo IPN handler error: ${error.message}`);
    return res.status(500).json({ resultCode: 99, message: error.message || 'Internal server error' });
  }
});

export default router;
