// netlify/functions/verify-payment.js
// ═══════════════════════════════════════════════════════════════
// ENGAGENEERING™ — Razorpay Payment Signature Verification
// Called AFTER Razorpay checkout completes.
// Verifies the payment is genuine before crediting Ψ.
// ═══════════════════════════════════════════════════════════════

const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin':  'https://engageneering.org',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = JSON.parse(event.body || '{}');

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing payment fields' }) };
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Config error' }) };
    }

    // Razorpay signature verification
    // signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const body      = razorpay_order_id + '|' + razorpay_payment_id;
    const expected  = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(razorpay_signature, 'hex')
    );

    if (!isValid) {
      console.error('Signature mismatch — possible fraud attempt');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Payment verification failed', valid: false }),
      };
    }

    // Signature valid — safe to credit Ψ
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: true, payment_id: razorpay_payment_id }),
    };

  } catch (err) {
    console.error('verify-payment error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Verification error' }) };
  }
};
