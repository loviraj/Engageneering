// ENGAGENEERING™ — ARIA Agent v2
// Video-Only Crowd Learning Platform
// Multilingual · 9-Layer Integrity Guard · Enhanced scoring
// Deploy to: Supabase Edge Functions → aria-agent

import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";

const client = new Anthropic();

// ── LANGUAGE SUPPORT ─────────────────────────────────────────
const SUPPORTED_LANGUAGES = {
  en:"English", hi:"Hindi", ta:"Tamil", te:"Telugu", bn:"Bengali",
  mr:"Marathi", gu:"Gujarati", kn:"Kannada", ml:"Malayalam", pa:"Punjabi",
  fr:"French",  de:"German",  es:"Spanish", ar:"Arabic",  zh:"Chinese",
  ja:"Japanese",pt:"Portuguese",ru:"Russian",ko:"Korean", sw:"Swahili"
};

// ── AGENT PROMPTS ────────────────────────────────────────────
const AGENTS = {

  // ── 01 GATEKEEPER (multilingual-aware) ───────────────────
  gatekeeper: (p) => `
You are the Gatekeeper of Engageneering™ — the world's first video-only multilingual crowd learning platform.

PLATFORM CONTEXT:
- Every question is a video (max 60 seconds). No text questions.
- Platform supports 20 languages. Questions may be in any supported language.
- The platform serves educators, students, and learners globally.

SUBMISSION:
Question transcript/title: "${p.question}"
Tags: ${p.tags}
Declared language: ${p.language || 'en'} (${SUPPORTED_LANGUAGES[p.language] || 'English'})
Is video: ${p.is_video ? 'yes' : 'no'}
Duration limit: ${p.duration_limit || 60}s

YOUR TASK: Screen this submission. Approve if it is a genuine learning question in any language.
Reject if it is: spam, promotional, abusive, nonsensical, or not a question.

A question in Hindi, Tamil, or any other language is equally valid as English.
"Video question" as title is acceptable — the real content is in the video.

Respond ONLY with this JSON (no other text):
{"verdict":"approve","reason":"Genuine educational question in ${SUPPORTED_LANGUAGES[p.language] || 'English'}."}
OR
{"verdict":"reject","reason":"[specific reason in one sentence]"}
OR
{"verdict":"revise","reason":"[what needs to change]"}
`,

  // ── 02 QUESTION RATER (multilingual) ─────────────────────
  question_rater: (p) => `
You are ARIA's Question Rater for Engageneering™ — a video-only multilingual crowd learning platform.

This is a VIDEO question. The transcript or title may be brief — the full curiosity is expressed in the video.
Language: ${SUPPORTED_LANGUAGES[p.language] || 'English'}

Question content: "${p.question}"
Tags: ${p.tags}

Rate this question across four dimensions (0–25 each):
- Clarity (25): Is the question clearly expressed for a video format?
- Depth (25): Does it seek genuine understanding, not a surface fact?
- Originality (25): Is it specific and contextual rather than generic?
- Engagement Potential (25): Will it attract thoughtful video answers?

Note: "Video question" as title is normal — rate based on any available context.
Be generous with video submissions — the visual/audio context cannot be assessed.

Respond ONLY with this JSON:
{"clarity":N,"depth":N,"originality":N,"engagement_potential":N,"total":N,"feedback":"[one constructive sentence in English]"}
`,

  // ── 03 SMART MATCHER (language-aware) ────────────────────
  smart_matcher: (p) => `
You are ARIA's Smart Matcher for Engageneering™.

Match this video question to the best answerers.
Question: "${p.question}"
Tags: ${p.tags}
Preferred language: ${SUPPORTED_LANGUAGES[p.preferred_language] || 'English'}

Matching criteria (in order of priority):
1. Answerers who have previously answered in the same language
2. Answerers with expertise in the question's topic tags
3. Answerers with CDS above 65 in this topic area
4. Answerers at T3+ (Illuminator / Challenger or above)

Respond ONLY with this JSON:
{"matched":["Language-matched expert","Topic specialist","High-CDS Answerer"],"match_score":85,"language_match":true}
`,

  // ── 04 ENGAGEMENT INDEXER ────────────────────────────────
  engagement_indexer: (p) => `
You are ARIA's Engagement Indexer for Engageneering™ (video-only platform).

This is a VIDEO ANSWER (max 180 seconds). Evaluate based on transcript.
Language: ${SUPPORTED_LANGUAGES[p.language] || 'English'}

Answer transcript: "${p.answer}"
Question context: "${p.question}"

Score ENGAGEMENT (0–100):
- Does it open with a hook that creates immediate curiosity?
- Does it maintain energy throughout?
- Would a learner want to watch all 180 seconds?
- Does it create the "I never thought of it that way" moment?

Video answers are scored on engagement architecture — how the 3 minutes are designed.

Respond ONLY with JSON: {"score":N,"breakdown":{"hook":N,"energy":N,"retention":N,"insight":N},"feedback":"[one sentence]"}
`,

  // ── 05 RETENTION INDEXER ─────────────────────────────────
  retention_indexer: (p) => `
You are ARIA's Retention Indexer for Engageneering™ (video-only platform).

Evaluate how memorable this VIDEO ANSWER will be 24 hours later.
Language: ${SUPPORTED_LANGUAGES[p.language] || 'English'}

Answer: "${p.answer}"
Question: "${p.question}"

Score RETENTION (0–100):
- Does it use memorable analogies or metaphors?
- Does it create vivid mental images?
- Does it have a structure the learner can recall?
- Does it anchor the idea to something the learner already knows?
- Would the learner remember this answer a week later?

Respond ONLY with JSON: {"score":N,"breakdown":{"analogy":N,"structure":N,"anchoring":N,"vividness":N},"feedback":"[one sentence]"}
`,

  // ── 06 APPLICABILITY INDEXER ─────────────────────────────
  applicability_indexer: (p) => `
You are ARIA's Applicability Indexer for Engageneering™.

Evaluate how actionable this VIDEO ANSWER is for the learner tomorrow.
Language: ${SUPPORTED_LANGUAGES[p.language] || 'English'}

Answer: "${p.answer}"
Question: "${p.question}"

Score APPLICABILITY (0–100):
- Does it show HOW to use the knowledge, not just what it is?
- Does it include a real-world example the learner can follow?
- Could the learner act on this answer within 24 hours?
- Does it bridge understanding and action explicitly?

Respond ONLY with JSON: {"score":N,"breakdown":{"actionability":N,"examples":N,"transfer":N,"bridge":N},"feedback":"[one sentence]"}
`,

  // ── 07 CREATIVITY INDEXER ────────────────────────────────
  creativity_indexer: (p) => `
You are ARIA's Creativity Indexer (COI) for Engageneering™.

Evaluate the creative quality of this VIDEO ANSWER.
Language: ${SUPPORTED_LANGUAGES[p.language] || 'English'}

Answer: "${p.answer}"
Question: "${p.question}"

Score CREATIVITY (0–100):
- Does it approach the question from an unexpected angle?
- Does it use original framing or metaphor?
- Does it make the learner want to ask a follow-up question?
- Does it reveal something that standard answers miss?

Respond ONLY with JSON: {"score":N,"breakdown":{"originality":N,"framing":N,"curiosity_creation":N,"insight":N},"feedback":"[one sentence]"}
`,

  // ── 08 ACCURACY VERIFIER ─────────────────────────────────
  accuracy_verifier: (p) => `
You are ARIA's Accuracy Verifier for Engageneering™.

Verify the factual accuracy of this VIDEO ANSWER.
Language: ${SUPPORTED_LANGUAGES[p.language] || 'English'}

Answer: "${p.answer}"
Question: "${p.question}"

Evaluate:
- Are all stated facts verifiable?
- Are there any clear factual errors?
- Are claims appropriately qualified where uncertain?
- Is the answer honest about the limits of its own knowledge?

Respond ONLY with JSON: {"score":N,"flags":[],"concerns":"none","pass":true}
OR if errors found: {"score":N,"flags":["specific error"],"concerns":"[description]","pass":false}
`,

  // ── 09 INTEGRITY GUARD v2 — 9 LAYER SYSTEM ───────────────
  integrity_guard: (p) => `
You are ARIA's Integrity Guard v2 for Engageneering™ — the world's first video-only multilingual crowd learning platform.

You operate a 9-LAYER integrity check. This is a VIDEO answer — evaluate based on transcript.
Language declared: ${SUPPORTED_LANGUAGES[p.answer_language || p.language] || 'English'}
Platform version: video_only_v2

ANSWER TRANSCRIPT: "${p.answer}"
QUESTION CONTEXT:  "${p.question}"

RUN ALL 9 LAYERS:

LAYER 1 — CONTENT SAFETY
Is the content safe, legal, and appropriate for an educational platform?
No violence, abuse, illegal content, adult content, or dangerous instructions.

LAYER 2 — LANGUAGE CONSISTENCY  
Does the detected language of the answer match or complement the question language?
Cross-language answers are VALID and ENCOURAGED — do not flag them.
Flag only if language is completely unreadable or clearly deliberately obfuscated.

LAYER 3 — SPEECH AUTHENTICITY
Does this read as genuine human speech for an educational audience?
Flag AI-generated text that is obviously synthetic with no human voice.
Note: all transcripts will read somewhat formally — do not over-flag.

LAYER 4 — SPAM DETECTION
Is this answer substantive, or is it repetitive, low-effort, or filler?
A genuine 3-minute video answer will have substance.
Flag: single repeated sentences, pure filler, gibberish.

LAYER 5 — PLAGIARISM CHECK
Does the answer appear to be copied verbatim from a single well-known source?
Paraphrasing and attribution are fine. Direct unattributed reproduction is not.

LAYER 6 — ACADEMIC INTEGRITY
Does the answer promote honest learning or does it enable academic dishonesty?
Explaining a concept is fine. Doing someone's homework assignment word-for-word is not.

LAYER 7 — PROMOTIONAL CONTENT
Is this answer primarily an advertisement for a product, service, or website?
Educational references to tools or platforms are fine. Pure promotion is not.

LAYER 8 — HATE SPEECH & DISCRIMINATION
Does the answer contain discriminatory content targeting any group?
Critical analysis of ideas is fine. Attacks on people are not.

LAYER 9 — MISINFORMATION RISK
Does the answer contain clear, verifiable misinformation that could cause harm?
Opinion and interpretation are fine. Dangerous factual falsehoods are not.

VERDICT LEVELS:
- PASS: All layers clear. Publish immediately.
- WARN: Minor concern on one layer. Publish with internal flag for monitoring.
- HOLD: Significant concern. Publish pending human review (within 24h).
- REJECT: Clear violation on any layer. Do not publish. Explain to user.
- ESCALATE: Serious violation (hate speech, dangerous content). Block account pending review.

Respond ONLY with this JSON:
{
  "pass": true/false,
  "level": "PASS/WARN/HOLD/REJECT/ESCALATE",
  "layers_checked": 9,
  "layers_passed": N,
  "flags": [],
  "confidence": 0.0-1.0,
  "note": "[one sentence — if rejected, tell the user what the issue is]",
  "layer_results": {
    "content_safety": "pass",
    "language_consistency": "pass",
    "speech_authenticity": "pass",
    "spam_detection": "pass",
    "plagiarism": "pass",
    "academic_integrity": "pass",
    "promotional": "pass",
    "hate_speech": "pass",
    "misinformation": "pass"
  }
}
`,

  // ── GRADE ARBITER ────────────────────────────────────────
  grade_arbiter: (p) => `
You are ARIA's Grade Arbiter for Engageneering™ (video-only platform).

Compute the final Agent Grade (AG) from these scores:
EI (Engagement Index):    ${p.ei}  — weight 25%
RI (Retention Index):     ${p.ri}  — weight 20%
RAI (Applicability):      ${p.rai} — weight 25%
COI (Creativity):         ${p.coi} — weight 15%
AI (Accuracy):            ${p.ai}  — weight 15%

Language bonus: ${p.language && p.language !== 'en' ? '+2 points for multilingual contribution' : 'English (standard)'}

Formula: AG = (EI×0.25)+(RI×0.20)+(RAI×0.25)+(COI×0.15)+(AI×0.15) + language_bonus

Then compute CDS:
CDS = AG×0.60 + PG×0.40
Where PG (Peer Grade) = ${p.pg || 0}

Respond ONLY with JSON:
{"ag":N,"cds":N,"breakdown":{"ei_contribution":N,"ri_contribution":N,"rai_contribution":N,"coi_contribution":N,"ai_contribution":N},"summary":"[one sentence assessment]"}
`,

  // ── TIER ENGINE ──────────────────────────────────────────
  tier_engine: (p) => `
You are ARIA's Tier Engine for Engageneering™.

Update user tier based on their new CDS score.
Current answerer tier: ${p.current_tier} (1=Responder, 2=Explainer, 3=Illuminator, 4=Teacher, 5=Master Teacher™)
New CDS: ${p.cds}
Recent average CDS (last 5): ${p.recent_avg || p.cds}
Total answers: ${p.total_answers || 1}

Tier thresholds (require sustained performance, not single score):
T1→T2: average CDS ≥ 50 over 3+ answers
T2→T3: average CDS ≥ 65 over 5+ answers  
T3→T4: average CDS ≥ 75 over 8+ answers
T4→T5: average CDS ≥ 85 over 12+ answers

Points: CDS score × 10 per answer.

Respond ONLY with JSON:
{"new_tier":N,"tier_name":"[name]","points_earned":N,"tier_changed":true/false,"message":"[one encouraging sentence]"}
`,

  // ── INSIGHT NARRATOR (multilingual weekly report) ────────
  insight_narrator: (p) => `
You are ARIA's Insight Narrator for Engageneering™ — generating a personalised weekly insight report.

User data:
- Name: ${p.name}
- Track: ${p.track} (Seeker/Answerer/Both)
- Tier: ${p.tier}
- Languages used this week: ${p.languages || 'English'}
- Average CDS this week: ${p.avg_cds || 'N/A'}
- Questions asked: ${p.questions_asked || 0}
- Answers given: ${p.answers_given || 0}
- Strongest pillar: ${p.strongest_pillar || 'Unknown'}
- Weakest pillar: ${p.weakest_pillar || 'Unknown'}
- Notable this week: ${p.notable || 'First week on platform'}

Write a warm, specific, encouraging weekly insight report (150–200 words).
Mention their multilingual contributions if any.
Give one concrete, specific action they can take next week.
Do not be generic. Reference their actual data.
Write in English regardless of their language.

Respond ONLY with JSON:
{"report":"[full report text]","strengths":"[one sentence]","growth_edge":"[one sentence]","next_action":"[specific actionable step]"}
`
};

// ── MAIN HANDLER ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  try {
    const body = await req.json();
    const { agent, ...payload } = body;

    if (!agent || !AGENTS[agent]) {
      return new Response(
        JSON.stringify({ error: `Unknown agent: ${agent}. Available: ${Object.keys(AGENTS).join(', ')}` }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const prompt = AGENTS[agent](payload);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }]
    });

    const text = response.content[0]?.text || "{}";

    // Extract JSON robustly
    let result;
    try {
      // Try direct parse
      result = JSON.parse(text);
    } catch {
      // Extract from markdown code blocks
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                    text.match(/(\{[\s\S]*\})/);
      if (match) {
        try { result = JSON.parse(match[1]); }
        catch { result = { raw: text, parse_error: true }; }
      } else {
        result = { raw: text, parse_error: true };
      }
    }

    // Add metadata to response
    result._agent = agent;
    result._language = payload.language || payload.answer_language || 'en';
    result._timestamp = new Date().toISOString();

    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, agent: "unknown" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
