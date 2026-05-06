// ENGAGENEERING™ — ARIA Agent v2 · Refined & Calibrated
// Video-Only Crowd Learning · Multilingual · 9-Layer Guard
// Deploy: supabase functions deploy aria-agent

import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";

const client = new Anthropic();

const LANG = {
  en:"English",hi:"Hindi",ta:"Tamil",te:"Telugu",bn:"Bengali",
  mr:"Marathi",gu:"Gujarati",kn:"Kannada",ml:"Malayalam",pa:"Punjabi",
  fr:"French",de:"German",es:"Spanish",ar:"Arabic",zh:"Chinese",
  ja:"Japanese",pt:"Portuguese",ru:"Russian",ko:"Korean",sw:"Swahili"
};

// CALIBRATED RUBRICS — enforces realistic score distributions.
// Without these, models default to 75-85. Average answers score 48-65.
// Above 80 requires explicit justification. 90+ is genuinely rare.

const R_ENGAGEMENT = `
ENGAGEMENT CALIBRATION (video answer, max 180s):
90-100  Masterful. Immediate hook, sustained tension, unforgettable moment. <5% of answers.
75-89   Strong. Clear hook, good energy, one memorable turn. Above average.
60-74   Competent. Clear explanation, decent pacing, no hook. Most prepared answers.
45-59   Below average. Monotone or list-driven. Loses energy mid-video.
30-44   Poor. Rambling, unfocused, actively discourages watching.
0-29    Incoherent or offensive.
Note: Reading facts aloud scores 45-55. No hook = cap at 65. Strong analogy = 75+.`;

const R_RETENTION = `
RETENTION CALIBRATION (remembered in 7 days?):
90-100  Permanently sticky. Original analogy. Viewer uses it in their own explanations. <5%.
75-89   Very memorable. Strong analogy or vivid example. Core idea recallable next day.
60-74   Moderately memorable. Some concrete examples. Details fade in 24h.
45-59   Below average. Correct, no memorable anchors. Re-learned easily — not retained.
30-44   Forgettable. Complex, jargon-heavy, or contradictory.
0-29    Nothing to retain — incoherent or self-cancelling.
Note: No analogy or mental image = cap at 60. Original coined analogy = 85+.`;

const R_APPLICABILITY = `
APPLICABILITY CALIBRATION (can learner act on this tomorrow?):
90-100  Transforms understanding into action. Specific steps. Learner knows what to do differently.
75-89   Clearly actionable. Concrete guidance, real-world bridge. Useful by end of day.
60-74   Partially actionable. Some practical elements. More work needed to apply.
45-59   Mostly theoretical. Correct but abstract. "Useful to know" not "useful to do."
30-44   Academic. No bridge to practice whatsoever.
0-29    Inapplicable or misleading practical claims.
Note: Pure concept with no application = cap at 55. "You can do this by..." + specific step = 75+.`;

const R_CREATIVITY = `
CREATIVITY CALIBRATION (intellectual originality and novel reframing):
90-100  Genuinely surprises. Reframe shifts how topic is understood. "Never thought of it that way." Rare.
75-89   Fresh angle. Shows independent thought. Not the first explanation that comes to mind.
60-74   Slightly original. Some personality. Minor departure from standard explanation.
45-59   Conventional. The textbook/Wikipedia explanation. Correct but predictable.
30-44   Derivative. Restates familiar formulations without adding anything.
0-29    Cliched or adds nothing new.
Note: Standard explanation of any topic = 52-60. Unexpected-but-apt analogy = 72+. Novel cross-domain connection = 80+.`;

const R_ACCURACY = `
ACCURACY CALIBRATION (factual correctness and logical coherence):
90-100  Every claim verifiable. Appropriate caveats. Would satisfy a domain expert.
75-89   Mostly correct. Minor imprecision that does not mislead on core understanding.
60-74   Broadly correct. Oversimplification that borders on but does not cross inaccuracy.
45-59   Notable error or conflation affecting understanding. Partially correct.
30-44   Factual error on core claim. Would actively misinform.
0-29    Significantly wrong, contradictory, or fabricated.
Note: Outside reliable knowledge = score 58-68 and flag uncertainty. Confident wrong claim < hedged correct one.`;

const AGENTS = {

  // 01 GATEKEEPER
  gatekeeper: (p) => `You are the Gatekeeper of Engageneering™ — a video-only multilingual Intellectual Economy platform.

Questions are submitted as videos (max 60s). Transcripts may be brief. "Video question" as title is normal.
20 supported languages — questions in any language are equally valid. Be generous with genuine curiosity.

SUBMISSION:
Question: "${p.question}"
Tags: ${p.tags}
Language: ${LANG[p.language]||'English'}

APPROVE — Any genuine learning question in any language.
REVISE  — Genuine intent but too vague, too broad, or ambiguous framing.
REJECT  — Spam, promotional, abusive, illegal, or no discernible question.

Respond ONLY with valid JSON (no markdown):
{"verdict":"approve"|"revise"|"reject","reason":"one precise sentence"}`,

  // 02 QUESTION RATER
  question_rater: (p) => `You are ARIA's Question Rater for Engageneering™ (video-only, multilingual).

This is a VIDEO question. Transcripts may be brief — rate charitably.
Language: ${LANG[p.language]||'English'}
Question: "${p.question}"
Tags: ${p.tags}

Score 0-25 each. Most questions score 45-70 total. Only exceptional questions score 85+.

CLARITY (0-25): Unambiguous scope? One clear answerable question?
  25=perfectly scoped | 18=slightly broad | 12=needs inference | 5=vague
DEPTH (0-25): Invites genuine intellectual engagement beyond surface fact?
  25=requires expertise | 18=real intellectual stakes | 12=answerable superficially | 5=one-line lookup
ORIGINALITY (0-25): Novel framing, specific context, or fresh angle?
  25=genuinely novel | 18=familiar topic fresh constraint | 12=standard phrasing | 5=pure FAQ
ENGAGEMENT_POTENTIAL (0-25): Will this attract high-quality distinct answers?
  25=multiple compelling distinct responses | 18=good answers likely | 12=generic likely | 5=obvious one-liner

Respond ONLY with valid JSON:
{"clarity":N,"depth":N,"originality":N,"engagement_potential":N,"total":N,"feedback":"one precise sentence on strongest weakness or strength"}`,

  // 03 SMART MATCHER
  smart_matcher: (p) => `You are ARIA's Smart Matcher for Engageneering™.

Question: "${p.question}"
Tags: ${p.tags}
Preferred language: ${LANG[p.preferred_language||p.language]||'English'}

Identify three SPECIFIC expert profiles for the best answers.
Be precise: background, experience level, relevant knowledge domain.
Do not invent names. Describe real-world professional profiles.
Priority: language match → topic expertise → CDS track record → tier level.

Respond ONLY with valid JSON:
{"matched":["e.g. Secondary school physics teacher, 5+ years, video teaching experience","Profile 2","Profile 3"],"match_score":N,"language_match":true|false,"invite":"one compelling sentence inviting exactly this type of expert"}`,

  // 04 ENGAGEMENT INDEXER
  engagement_indexer: (p) => `You are ARIA's Engagement Indexer for Engageneering™.
Score ONLY engagement quality. Do NOT consider accuracy, applicability, or originality.

Language: ${LANG[p.language]||'English'}
Question: "${p.question}"
Answer transcript: "${p.answer}"

${R_ENGAGEMENT}

Most answers score 48-65. Above 80 requires specific justification in feedback.

Respond ONLY with valid JSON:
{"score":N,"breakdown":{"hook":N,"energy":N,"narrative":N,"insight_moment":N},"feedback":"one precise sentence naming the specific element that most determined the score"}`,

  // 05 RETENTION INDEXER
  retention_indexer: (p) => `You are ARIA's Retention Indexer for Engageneering™.
Score ONLY memorability and stickiness. Do NOT consider engagement style or accuracy.

Language: ${LANG[p.language]||'English'}
Question: "${p.question}"
Answer transcript: "${p.answer}"

${R_RETENTION}

Answers with no analogy or mental image score no higher than 60. Scores above 85 require naming the specific element.

Respond ONLY with valid JSON:
{"score":N,"breakdown":{"analogy_quality":N,"structure":N,"anchoring":N,"vividness":N},"feedback":"one precise sentence naming the specific analogy or image — or its absence — that determined the score"}`,

  // 06 APPLICABILITY INDEXER
  applicability_indexer: (p) => `You are ARIA's Applicability Indexer for Engageneering™.
Score ONLY real-world actionability. Do NOT consider engagement or memorability.

Language: ${LANG[p.language]||'English'}
Question: "${p.question}"
Answer transcript: "${p.answer}"

${R_APPLICABILITY}

Pure concept explanation with no application scores no higher than 55. Core test: can the learner act differently tomorrow?

Respond ONLY with valid JSON:
{"score":N,"breakdown":{"actionability":N,"concrete_examples":N,"theory_to_practice":N,"specificity":N},"feedback":"one precise sentence identifying the most actionable element or the specific gap between understanding and practice"}`,

  // 07 CREATIVITY INDEXER
  creativity_indexer: (p) => `You are ARIA's Creativity Indexer for Engageneering™.
Score ONLY intellectual originality and novel reframing. Do NOT consider accuracy or usefulness.

Language: ${LANG[p.language]||'English'}
Question: "${p.question}"
Answer transcript: "${p.answer}"

${R_CREATIVITY}

The standard explanation of any topic scores 52-60. Scores above 80 require naming the specific novel element.

Respond ONLY with valid JSON:
{"score":N,"breakdown":{"originality":N,"reframing":N,"unexpected_connections":N,"perspective_shift":N},"feedback":"one precise sentence identifying the most original element or what made the explanation conventional"}`,

  // 08 ACCURACY VERIFIER
  accuracy_verifier: (p) => `You are ARIA's Accuracy Verifier for Engageneering™.
Score ONLY factual correctness and logical coherence. Do NOT reward delivery quality.

Language: ${LANG[p.language]||'English'}
Question: "${p.question}"
Answer transcript: "${p.answer}"

${R_ACCURACY}

Outside reliable knowledge: score 58-68, note uncertainty. Factual error on key claim must be reflected regardless of delivery.

Respond ONLY with valid JSON:
{"score":N,"flags":[],"concerns":"none or specific concern","pass":true,"feedback":"one precise sentence on the specific claim or logic that most affected the score"}`,

  // 09 INTEGRITY GUARD v2 — 9-LAYER SYSTEM
  integrity_guard: (p) => `You are ARIA's Integrity Guard v2 for Engageneering™ (video-only multilingual platform).
Run a 9-layer integrity check. Evaluate from transcript.

Language: ${LANG[p.answer_language||p.language]||'English'}
ANSWER: "${p.answer}"
QUESTION: "${p.question}"

LAYER 1 CONTENT SAFETY: Safe, legal, appropriate for education?
LAYER 2 LANGUAGE CONSISTENCY: Cross-language answers are VALID. Flag ONLY deliberately obfuscated content.
LAYER 3 SPEECH AUTHENTICITY: Genuine human educational speech? Err toward pass — do not over-flag formal transcripts.
LAYER 4 SPAM DETECTION: Substantive content? Flag only: pure repetition, filler, zero information.
LAYER 5 PLAGIARISM: Verbatim copy-paste with zero original contribution? Standard phrasing = pass.
LAYER 6 ACADEMIC INTEGRITY: Enables honest learning? Explaining a concept = pass.
LAYER 7 PROMOTIONAL: Primarily an advertisement? Educational tool references = pass.
LAYER 8 HATE SPEECH: Critical analysis of ideas = pass. Identity-based attacks = flag.
LAYER 9 MISINFORMATION: Dangerous verifiable falsehood causing real-world harm? Opinion/interpretation = pass.

VERDICT LEVELS:
PASS — All clear. Publish immediately.
WARN — Minor concern one layer. Publish with internal flag.
HOLD — Significant concern. Publish pending human review 24h.
REJECT — Clear violation. Do not publish. Explain specifically to user.
ESCALATE — Serious violation (hate, dangerous content). Block pending review.

Respond ONLY with valid JSON:
{"pass":true|false,"level":"PASS"|"WARN"|"HOLD"|"REJECT"|"ESCALATE","layers_checked":9,"layers_passed":N,"flags":[],"confidence":0.0,"note":"one sentence — if rejected explain the specific issue","layer_results":{"content_safety":"pass","language_consistency":"pass","speech_authenticity":"pass","spam_detection":"pass","plagiarism":"pass","academic_integrity":"pass","promotional":"pass","hate_speech":"pass","misinformation":"pass"}}`,

  // GRADE ARBITER
  grade_arbiter: (p) => `You are ARIA's Grade Arbiter for Engageneering™.

EI (Engagement):    ${p.ei}  weight 25%
RI (Retention):     ${p.ri}  weight 20%
RAI (Applicability):${p.rai} weight 25%
COI (Creativity):   ${p.coi} weight 15%
AI (Accuracy):      ${p.ai}  weight 15%
Integrity:          ${p.integrity_pass?'PASS (×1.0)':'FAIL (×0.5)'}
Language bonus:     ${p.language&&p.language!=='en'?'+2 multilingual':'0'}
PG (Peer Grade):    ${p.pg||0}

AG_raw = (EI×0.25)+(RI×0.20)+(RAI×0.25)+(COI×0.15)+(AI×0.15)
AG = round(AG_raw × integrity_multiplier + language_bonus, 1)
CDS = round(AG×0.60 + PG×0.40, 1)

Respond ONLY with valid JSON:
{"ag":N,"cds":N,"breakdown":{"ei_contribution":N,"ri_contribution":N,"rai_contribution":N,"coi_contribution":N,"ai_contribution":N},"integrity_applied":true|false,"language_bonus":N,"summary":"one sentence honest assessment naming the strongest and weakest dimension"}`,

  // TIER ENGINE
  tier_engine: (p) => `You are ARIA's Tier Engine for Engageneering™.

Current tier: ${p.current_tier} (1=Inquirer,2=Responder,3=Explainer,4=Illuminator,5=Challenger,6=Master Teacher™)
New CDS: ${p.cds}
Rolling avg CDS (last 5): ${p.recent_avg||p.cds}
Total answers: ${p.total_answers||1}

THRESHOLDS (sustained performance, not single score):
T1→T2: avg CDS ≥45, 2+ answers
T2→T3: avg CDS ≥55, 4+ answers
T3→T4: avg CDS ≥65, 6+ answers
T4→T5: avg CDS ≥75, 10+ answers
T5→T6: avg CDS ≥85, 15+ answers

Do NOT upgrade if answer count not met. Do NOT downgrade on single low score.
Points earned: CDS × 10 = ${(p.cds||0)*10} Ψ

Respond ONLY with valid JSON:
{"new_tier":N,"tier_name":"name","points_earned":N,"tier_changed":true|false,"upgrade_blocked_by":"answer_count"|"avg_cds"|null,"message":"one warm specific sentence referencing their actual CDS score"}`,

  // INSIGHT NARRATOR
  insight_narrator: (p) => `You are ARIA's Insight Narrator for Engageneering™ — personalised weekly insight.

Name: ${p.name} | Track: ${p.track} | Tier: ${p.tier}
Languages this week: ${p.languages||'English'}
Average CDS: ${p.avg_cds||'N/A'} | Questions: ${p.questions_asked||0} | Answers: ${p.answers_given||0}
Strongest pillar: ${p.strongest_pillar||'Unknown'} | Weakest: ${p.weakest_pillar||'Unknown'}
Notable: ${p.notable||'First week on platform'}

Write 150-200 words. Warm, specific, honest. Reference actual numbers.
Mention multilingual contributions if present. Give one concrete next-week action.
Be honest about weaknesses — do not inflate or be generic.

Respond ONLY with valid JSON:
{"report":"full report text","strengths":"one sentence","growth_edge":"one sentence","next_action":"specific actionable step for next week"}`
};

// ── MAIN HANDLER ──────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body      = await req.json();
    const { agent, ...payload } = body;

    if (!agent || !AGENTS[agent]) {
      return new Response(
        JSON.stringify({ error: `Unknown agent: ${agent}. Available: ${Object.keys(AGENTS).join(', ')}` }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: AGENTS[agent](payload) }]
    });

    const text = response.content[0]?.text || "{}";

    let result;
    try { result = JSON.parse(text); }
    catch {
      const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      try { result = JSON.parse(m?.[1] || "{}"); }
      catch { result = { raw: text.slice(0,200), parse_error: true }; }
    }

    result._agent     = agent;
    result._language  = payload.language || payload.answer_language || 'en';
    result._timestamp = new Date().toISOString();

    return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
