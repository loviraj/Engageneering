// netlify/functions/create-order.js
// ═══════════════════════════════════════════════════════════════
// ENGAGENEERING™ — Razorpay Order Creation (Server-side)
// Called by platform.html before opening Razorpay checkout.
// The Razorpay Key Secret NEVER reaches the browser.
// ═══════════════════════════════════════════════════════════════

const https = require('https');

// Razorpay pack definitions — single source of truth
const PSI_PACKS = {
  50:   { inr: 49,  inrWithGst: 58  },
  200:  { inr: 149, inrWithGst: 176 },
  500:  { inr: 299, inrWithGst: 353 },
  1500: { inr: 799, inrWithGst: 943 },
};

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin':  'https://engageneering.org',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { psi, user_id } = JSON.parse(event.body || '{}');

    // Validate pack
    if (!PSI_PACKS[psi]) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid Ψ pack' }) };
    }

    const pack       = PSI_PACKS[psi];
    const amountPaise = pack.inrWithGst * 100; // Razorpay requires paise

    // Keys from Netlify environment variables — NEVER sent to browser
    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('Razorpay keys missing in environment variables');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Payment config error' }) };
    }

    // Create Razorpay order via their REST API
    const orderPayload = JSON.stringify({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `YOM-${Date.now().toString(36).toUpperCase()}`,
      notes: {
        psi_pack: psi,
        user_id:  user_id || '',
        platform: 'engageneering',
      },
    });

    const order = await new Promise((resolve, reject) => {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const req  = https.request({
        hostname: 'api.razorpay.com',
        path:     '/v1/orders',
        method:   'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type':  'application/json',
          'Content-Length': Buffer.byteLength(orderPayload),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch(e) { reject(new Error('Invalid Razorpay response')); }
        });
      });
      req.on('error', reject);
      req.write(orderPayload);
      req.end();
    });

    if (order.error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: order.error.description }) };
    }

    // Return ONLY what the browser needs — key secret never leaves server
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        order_id:    order.id,          // safe to expose
        key_id:      keyId,             // safe to expose (public key)
        amount:      amountPaise,
        psi,
        base_inr:    pack.inr,
        gst_inr:     pack.inrWithGst - pack.inr,
        total_inr:   pack.inrWithGst,
      }),
    };

  } catch (err) {
    console.error('create-order error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Order creation failed' }) };
  }
};
