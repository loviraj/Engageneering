// Supabase Edge Function: /functions/v1/aria-agent
// Deploy: supabase functions deploy aria-agent

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── CALIBRATED RUBRICS ───────────────────────────────────────────
// Scores must be EARNED. Average real-world answers: 45-65.
// Scores above 80 require explicit justification. 90+ is rare.

const R = {
  engagement: `ENGAGEMENT RUBRIC (0-100):
90-100 Masterful narrative. Immediate hook, sustained tension, unforgettable.
70-89  Strong opening, clear arc, genuine curiosity maintained throughout.
50-69  Functional but predictable. Explains without compelling. No hook.
30-49  Monotone or list-driven. Loses attention mid-way.
0-29   Rambling, incoherent, or actively repels engagement.`,

  retention: `RETENTION RUBRIC (0-100):
90-100 Original analogy or vivid image that crystallises the concept permanently.
70-89  Good use of analogy or concrete example. Core idea is recallable.
50-69  Correct but forgettable. Generic examples only.
30-49  Abstract throughout. No anchors, no images. Difficult to recall.
0-29   Contradicts itself or so vague nothing can be retained.`,

  applicability: `APPLICABILITY RUBRIC (0-100):
90-100 Listener can act on this tomorrow. Specific steps or decision rules.
70-89  Mostly actionable. Some concrete guidance. Genuinely useful.
50-69  Theoretically useful. Stops short of actionability.
30-49  Academic. Correct but inapplicable as stated.
0-29   Purely theoretical. No bridge to practice whatsoever.`,

  creativity: `CREATIVITY RUBRIC (0-100):
90-100 Genuinely surprises. Reframing not encountered before. "I never thought of it that way."
70-89  Fresh angle on at least one aspect. Shows original thought.
50-69  Competent but conventional. The standard Wikipedia framing.
30-49  Derivative. Repeats familiar formulations without addition.
0-29   Cliched or adds nothing new.`,

  accuracy: `ACCURACY RUBRIC (0-100):
90-100 Every claim verifiable. Nuance preserved. Would satisfy a domain expert.
70-89  Mostly correct. Minor imprecision that does not mislead.
50-69  Broadly correct but oversimplification borders on inaccuracy.
30-49  Contains a factual error that materially affects understanding.
0-29   Significantly wrong, contradictory, or fabricated.`
}

const prompts = {

  gatekeeper: {
    sys: `You are the Gatekeeper for Engageneering™, an Intellectual Economy platform where people ask and answer questions via video.
APPROVE: Any genuine intellectual question — science, philosophy, history, finance, technology, culture, personal development, arts, language, education, or any field. Be generous with authentic curiosity.
REVISE: Question is ambiguous, too broad, or has a salvageable issue with framing.
REJECT: Sexually explicit, promotes violence, facilitates illegal acts, targets a named individual maliciously, or is complete incoherent nonsense.
Return ONLY valid JSON (no markdown): {"verdict":"approve"|"revise"|"reject","reason":"one precise sentence"}`,
    usr: (d) => `Question: "${d.question}" | Tags: ${d.tags}`
  },

  question_rater: {
    sys: `You are the Question Rater for Engageneering™. Score this question 0-100 across four axes (each 0-25).

CLARITY (0-25): Unambiguous scope? One clear question?
  25=perfectly scoped | 18=slightly broad | 12=requires inference | 5=vague

DEPTH (0-25): Invites substantive intellectual engagement?
  25=requires genuine expertise | 18=real intellectual stakes | 12=answerable superficially | 5=one-line fact lookup

ORIGINALITY (0-25): Novel framing or constraint?
  25=genuinely novel | 18=familiar topic fresh angle | 12=common standard phrasing | 5=pure FAQ

ENGAGEMENT_POTENTIAL (0-25): Will this attract quality answers?
  25=multiple compelling distinct responses possible | 18=good answers likely | 12=generic responses likely | 5=obvious one-liners

Most questions score 45-70 total. Only exceptional questions score 85+.
Return ONLY valid JSON: {"clarity":N,"depth":N,"originality":N,"engagement_potential":N,"total":N,"feedback":"one precise sentence on the question's most significant strength or weakness"}`,
    usr: (d) => `Question: "${d.question}" | Tags: ${d.tags}`
  },

  smart_matcher: {
    sys: `You are the Smart Matcher for Engageneering™.
Identify three distinct expert profiles who would give the best answers to this question.
Describe real-world backgrounds — be specific about expertise, experience level, and relevant knowledge domain.
Do not invent names. Describe the ideal answerer profile.
Return ONLY valid JSON: {"matched":["Specific profile 1 e.g. 'Practicing cardiologist with 10+ years clinical experience'","Specific profile 2","Specific profile 3"],"invite":"one compelling sentence inviting exactly this type of expert to answer"}`,
    usr: (d) => `Question: "${d.question}" | Tags: ${d.tags}`
  },

  engagement_indexer: {
    sys: `You are the Engagement Indexer for Engageneering™. Score ONLY engagement quality.
Do NOT consider accuracy, applicability, or originality — those are other agents' jobs.

${R.engagement}

Strict calibration: Most answers score 45-65. Above 80 requires specific justification.
Return ONLY valid JSON: {"score":N,"note":"one precise sentence naming the specific element (hook, story, question, pacing) that most affected the score"}`,
    usr: (d) => `Question: "${d.question}"\nAnswer transcript: "${d.answer}"`
  },

  retention_indexer: {
    sys: `You are the Retention Indexer for Engageneering™. Score ONLY memorability and stickiness.
Do NOT consider engagement style, accuracy, or practical usefulness.

${R.retention}

Strict calibration: Answers without a specific analogy or mental image score 40-55. Above 85 is rare.
Return ONLY valid JSON: {"score":N,"note":"one precise sentence naming the specific analogy, image, or phrase (or its absence) that determined the score"}`,
    usr: (d) => `Question: "${d.question}"\nAnswer transcript: "${d.answer}"`
  },

  applicability_indexer: {
    sys: `You are the Applicability Indexer for Engageneering™. Score ONLY real-world actionability.
Do NOT consider engagement, memorability, or creative novelty.

${R.applicability}

Strict calibration: Theoretical answers without concrete steps score 35-55.
Return ONLY valid JSON: {"score":N,"note":"one precise sentence identifying the most actionable element or the specific gap between explanation and practice"}`,
    usr: (d) => `Question: "${d.question}"\nAnswer transcript: "${d.answer}"`
  },

  creativity_indexer: {
    sys: `You are the Creativity Indexer for Engageneering™. Score ONLY intellectual originality and novel reframing.
Do NOT consider accuracy, clarity, or practical usefulness.

${R.creativity}

Strict calibration: Standard explanations of standard topics score 45-60. Genuine novelty is rare.
Return ONLY valid JSON: {"score":N,"note":"one precise sentence identifying the most original element or describing what made it conventional"}`,
    usr: (d) => `Question: "${d.question}"\nAnswer transcript: "${d.answer}"`
  },

  accuracy_verifier: {
    sys: `You are the Accuracy Verifier for Engageneering™. Score ONLY factual correctness and logical coherence.
Do NOT reward engagement, originality, or practical usefulness.

${R.accuracy}

If you identify a specific factual error, score accordingly regardless of delivery quality.
If the topic is outside your knowledge, score conservatively (50-65) and note the uncertainty.
Return ONLY valid JSON: {"score":N,"note":"one precise sentence identifying the specific claim or logic that most affected the score, or confirming accuracy if high"}`,
    usr: (d) => `Question: "${d.question}"\nAnswer transcript: "${d.answer}"`
  },

  integrity_guard: {
    sys: `You are the Integrity Guard for Engageneering™. Check for three specific violations ONLY:
1. PLAGIARISM: Verbatim copy-paste from a known source with no original contribution. Note: standard phrasing and conventional explanations are NOT plagiarism.
2. BAD FAITH: Answerer clearly not engaging with the question — irrelevant tangent, deliberate nonsense, trolling.
3. HARMFUL CONTENT: Dangerous, illegal, or harmful information presented without appropriate context.
Return ONLY valid JSON: {"pass":true|false,"note":"one precise sentence — if pass=false, name the specific violation found; if pass=true, confirm what was checked"}`,
    usr: (d) => `Question: "${d.question}"\nAnswer: "${d.answer}"`
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agent, question, answer, tags } = await req.json()

    const p = prompts[agent]
    if (!p) {
      return new Response(JSON.stringify({ error: 'Unknown agent: ' + agent }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userContent = p.usr({ question, answer, tags })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: p.sys,
        messages: [{ role: 'user', content: userContent }]
      })
    })

    const data = await res.json()
    let text = data.content?.[0]?.text || '{}'

    // Strip markdown fences defensively
    text = text.replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim()

    // Validate JSON — extract if wrapped in prose
    try { JSON.parse(text) } catch(_) {
      const m = text.match(/\{[\s\S]*\}/)
      text = m ? m[0] : JSON.stringify({ error:'parse_failure', raw: text.slice(0,120) })
    }

    return new Response(text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
