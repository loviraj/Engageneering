// netlify/functions/create-order.js
// ─────────────────────────────────────────────────────────────────
// Engageneering™ — Razorpay order creation
// Phase 2: new clean-base GST-exclusive pricing
//
// New pack pricing (clean integers, no rounded-off line ever needed):
//   Ψ50   → base ₹50   + GST ₹9   = total ₹59
//   Ψ200  → base ₹175  + GST ₹31.50 = total ₹206.50  (10% volume discount)
//   Ψ500  → base ₹400  + GST ₹72  = total ₹472     (~20% volume discount)
//   Ψ1500 → base ₹1100 + GST ₹198 = total ₹1298    (~27% volume discount)
//
// Razorpay receives `amount` in paise (₹1 = 100 paise).
// We do all rupee math in NUMERIC and round to 2 decimals once at the end.
// ─────────────────────────────────────────────────────────────────

const PACKS = {
  50:   { base: 50,   psi: 50   },
  200:  { base: 175,  psi: 200  },
  500:  { base: 400,  psi: 500  },
  1500: { base: 1100, psi: 1500 },
};

const GST_RATE = 0.18;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Method not allowed' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp(400, { error: 'Invalid JSON' }); }

  const psi = Number(body.psi);
  if (!psi || !PACKS[psi]) {
    return resp(400, { error: 'Invalid Ψ pack. Allowed: 50, 200, 500, 1500.' });
  }
  if (!body.user_id) {
    return resp(400, { error: 'Missing user_id' });
  }

  const pack = PACKS[psi];
  const base = pack.base;
  // GST may produce paise (e.g. 175 * 0.18 = 31.50). Razorpay charges in paise,
  // so we keep 2-decimal precision.
  const gst   = +(base * GST_RATE).toFixed(2);
  const total = +(base + gst).toFixed(2);
  // Razorpay amount field is in paise (smallest currency unit)
  const amountPaise = Math.round(total * 100);

  // ── Razorpay Order API ──
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    console.error('Missing Razorpay credentials');
    return resp(500, { error: 'Payment gateway not configured' });
  }

  const orderPayload = {
    amount:   amountPaise,
    currency: 'INR',
    receipt:  `eng_${body.user_id.substring(0, 8)}_${Date.now()}`,
    notes: {
      psi:        String(pack.psi),
      base_inr:   String(base),
      gst_inr:    String(gst),
      total_inr:  String(total),
      gst_mode:   'exclusive',
      pack_label: `Ψ${pack.psi}`,
    },
  };

  try {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(orderPayload),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('Razorpay order error:', data);
      return resp(502, { error: data?.error?.description || 'Order create failed' });
    }

    return resp(200, {
      order_id:   data.id,
      amount:     data.amount,
      currency:   data.currency,
      key_id:     keyId,
      base_inr:   base,
      gst_inr:    gst,
      total_inr:  total,
      psi:        pack.psi,
      pack_label: `Ψ${pack.psi}`,
    });
  } catch (err) {
    console.error('Order create exception:', err);
    return resp(500, { error: 'Order create failed', detail: String(err.message || err) });
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function resp(statusCode, body) {
  return {
    statusCode,
    headers: { ...cors(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
