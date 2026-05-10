// netlify/functions/aria-moderate.js
// ═══════════════════════════════════════════════════════════════
// ARIA Integrity Guard — Content Moderation for Experience ARIA
// Called after a demo recording. Uses Anthropic Claude to:
//   1. Check for hate speech, profanity, explicit content
//   2. Check for sensitive / harmful content
//   3. Return a quality hint (0-1) for score enrichment
//   4. Never runs the full 12-agent pipeline — lightweight check only
//
// Even without a transcript (camera-only), returns quality hint
// based on duration so the demo always produces a score.
// ═══════════════════════════════════════════════════════════════

const https = require('https');

// ── Rate limiting — simple in-memory per cold-start ───────────
const _recentCalls = new Map();
const RATE_LIMIT_PER_IP = 5; // max 5 demo moderations per IP per cold start
const RATE_WINDOW_MS    = 60 * 60 * 1000; // 1 hour window

function checkRateLimit(ip) {
  const now  = Date.now();
  const key  = ip || 'unknown';
  const prev = _recentCalls.get(key) || [];
  const recent = prev.filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_PER_IP) return false;
  recent.push(now);
  _recentCalls.set(key, recent);
  return true;
}

// ── Call Anthropic API ─────────────────────────────────────────
async function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { reject(new Error('ANTHROPIC_API_KEY not set')); return; }

    const body = JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type':      'application/json',
        'Content-Length':    Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed?.content?.[0]?.text || '');
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Main handler ───────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  'https://engageneering.org',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Rate limit by IP
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || event.headers['client-ip'] || 'unknown';
  if (!checkRateLimit(ip)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        flagged: false,
        qualityHint: 0.5,
        rateLimited: true,
        message: 'Rate limit reached. Please try again later.',
      }),
    };
  }

  try {
    const { transcript = '', duration = 30 } = JSON.parse(event.body || '{}');

    // ── No transcript: just return duration-based quality hint ──
    if (!transcript || transcript.trim().length < 20) {
      const qualityHint = Math.min(duration / 60, 1);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ flagged: false, qualityHint }),
      };
    }

    // ── With transcript: run content check ──────────────────────
    const prompt = `You are the Integrity Guard for Engageneering, a Knowledge Commons platform for intellectual contribution. Your role is to screen content for platform safety.

Analyse this transcript from a 60-second video explanation:

"""
${transcript.slice(0, 2000)}
"""

Check for:
1. Hate speech, slurs, discrimination based on race, religion, gender, sexuality, nationality
2. Explicit sexual content or graphic violence
3. Promotion of self-harm, suicide, or harm to others
4. Spam, gibberish, or clear bad-faith submissions (e.g. just counting numbers, repeating nonsense)
5. Personal attacks or harassment

Do NOT flag:
- Normal discussion of controversial topics (politics, religion, history) if presented respectfully
- Strong opinions or criticism
- Mature academic content (medicine, history of violence, etc.)
- Any human language — the platform is multilingual

Respond with ONLY a JSON object (no markdown, no explanation outside the JSON):
{
  "flagged": true/false,
  "reason": "Brief explanation if flagged, null if not",
  "qualityHint": 0.0-1.0,
  "contentType": "educational/conversational/inappropriate/spam"
}

qualityHint guidelines:
- 0.9-1.0: Clear, structured explanation with good depth
- 0.7-0.9: Decent explanation, some structure
- 0.5-0.7: Attempted explanation, limited depth
- 0.3-0.5: Very brief or unclear
- 0.0-0.3: Spam, nonsense, or flagged content`;

    let responseText = '';
    try {
      responseText = await callClaude(prompt);
    } catch (apiErr) {
      console.error('Claude API error:', apiErr.message);
      // API unavailable — pass through with neutral quality hint
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ flagged: false, qualityHint: 0.6 }),
      };
    }

    // Parse Claude response
    let result = { flagged: false, qualityHint: 0.6 };
    try {
      // Strip any markdown fences if present
      const clean = responseText
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();
      result = JSON.parse(clean);
    } catch(parseErr) {
      console.error('Parse error:', parseErr.message, 'Raw:', responseText.slice(0, 200));
      // Parsing failed — assume safe, use neutral hint
      result = { flagged: false, qualityHint: 0.6 };
    }

    // Clamp qualityHint
    result.qualityHint = Math.max(0, Math.min(1, result.qualityHint || 0.6));

    // Never return reason text if not flagged
    if (!result.flagged) result.reason = null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (err) {
    console.error('aria-moderate error:', err.message);
    return {
      statusCode: 200, // don't block users on function errors
      headers,
      body: JSON.stringify({ flagged: false, qualityHint: 0.6 }),
    };
  }
};
