// ENGAGENEERING™ — Email Service Edge Function
// Deploy to: Supabase → Edge Functions → send-email
// Sends all 4 transactional emails via Resend
// From: aria@engageneering.org
//
// Triggers:
//   type: "welcome"          → on user signup
//   type: "question_scored"  → after gatekeeper + question_rater complete
//   type: "answer_scored"    → after all 5 scoring agents complete
//   type: "inactive"         → cron job after 14 days no login

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL     = "ARIA <aria@engageneering.org>";
const REPLY_TO       = "hello@engageneering.org";
const PLATFORM_URL   = "https://engageneering.org/platform";

// ── COLOUR CONSTANTS ─────────────────────────────────────────
const NAVY  = "#070f1e";
const NAVY2 = "#0a1628";
const NAVY3 = "#0f1e36";
const GOLD  = "#c8922a";
const GOLDB = "#e8b840";
const CREAM = "#f5eedc";
const T2    = "#b8cce8";
const T3    = "#7a9ab8";
const T4    = "#4a6a88";
const TEAL  = "#1d9e75";
const RED   = "#e24b4a";
const PURP  = "#7f77dd";

// ── SHARED COMPONENTS ────────────────────────────────────────
const LOGO_URL = "https://engageneering.org/logo.png";

function emailHeader(title, subtitle, accent = GOLD) {
  return `
  <tr>
    <td style="background:linear-gradient(135deg,${NAVY} 0%,${NAVY2} 50%,${NAVY3} 100%);
               padding:36px 40px 28px;text-align:center;
               border-bottom:3px solid ${accent}">
      <img src="${LOGO_URL}" width="56" height="62"
           alt="Engageneering™"
           style="display:block;margin:0 auto 14px"/>
      <div style="font-family:Georgia,serif;font-size:10px;
                  letter-spacing:4px;text-transform:uppercase;
                  color:${accent};margin-bottom:8px">
        ENGAGENEERING™
      </div>
      <div style="font-family:Georgia,serif;font-size:26px;
                  font-weight:700;color:${CREAM};line-height:1.3;
                  margin-bottom:8px">${title}</div>
      <div style="font-family:Arial,sans-serif;font-size:14px;
                  color:${T3};line-height:1.5">${subtitle}</div>
    </td>
  </tr>`;
}

function emailFooter() {
  return `
  <tr>
    <td style="background:${NAVY2};padding:24px 40px;
               border-top:1px solid #1e3a5a;text-align:center">
      <div style="margin-bottom:12px">
        <a href="https://engageneering.org"
           style="color:${GOLD};font-family:Arial,sans-serif;
                  font-size:12px;text-decoration:none">
          engageneering.org
        </a>
        <span style="color:${T4};margin:0 10px">·</span>
        <a href="mailto:hello@engageneering.org"
           style="color:${T4};font-family:Arial,sans-serif;
                  font-size:12px;text-decoration:none">
          hello@engageneering.org
        </a>
      </div>
      <div style="font-family:Arial,sans-serif;font-size:11px;
                  color:${T4};line-height:1.8">
        You are receiving this because you joined Engageneering™.<br>
        <a href="{{unsubscribe_url}}"
           style="color:${T4};text-decoration:underline">
          Unsubscribe
        </a>
      </div>
      <div style="margin-top:14px;font-family:Georgia,serif;
                  font-size:11px;color:#2a3a52;font-style:italic">
        Engineer the Engagement.
      </div>
    </td>
  </tr>`;
}

function wrap(rows, previewText = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Engageneering™</title>
</head>
<body style="margin:0;padding:0;background:#04090f">
  <div style="display:none;max-height:0;overflow:hidden;
              font-size:1px;color:#04090f">
    ${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0"
         border="0" width="100%"
         style="background:#04090f;padding:20px 0">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0"
             border="0" width="600"
             style="max-width:600px;border-radius:12px;
                    overflow:hidden;
                    box-shadow:0 8px 40px rgba(0,0,0,.6)">
        ${rows}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function scoreBar(label, score, color) {
  return `
  <div style="margin-bottom:14px">
    <table role="presentation" cellpadding="0" cellspacing="0"
           border="0" width="100%">
      <tr>
        <td>
          <span style="font-family:Arial,sans-serif;font-size:12px;
                       color:${T2};text-transform:uppercase;
                       letter-spacing:1px">${label}</span>
        </td>
        <td align="right">
          <span style="font-family:Georgia,serif;font-size:14px;
                       font-weight:700;color:${color}">${score}</span>
        </td>
      </tr>
    </table>
    <div style="background:#0f1e36;border-radius:4px;
                height:6px;overflow:hidden;margin-top:5px">
      <div style="background:${color};width:${score}%;
                  height:6px;border-radius:4px"></div>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// EMAIL BUILDERS
// ════════════════════════════════════════════════════════════════

function buildWelcome(data) {
  const {
    name, tier_name = "Curious Mind", tier_num = 1,
    track = "Both", join_date
  } = data;

  const tier_colors = {1:GOLD,2:TEAL,3:PURP,4:"#e8904a",5:"#e84a6f"};
  const tc = tier_colors[tier_num] || GOLD;

  const pillars = [
    [GOLD,  "🎯","Active Learning Design",   "You construct. You don't just receive."],
    [TEAL,  "💡","Curiosity Engineering",     "The question before the answer. Always."],
    [PURP,  "🔗","Peer Connection Systems",   "Teaching deepens the teacher."],
    ["#5b9bd5","⏱","Attention Architecture", "Design for the brain you have."],
    ["#e8904a","📊","Real-Time Feedback Loops","Immediate. Specific. Actionable."],
    ["#e84a6f","📈","Impact Measurement",     "Quality of thought. Not recall."],
  ];

  const pillarGrid = pillars.reduce((html, [col, icon, title, desc], i) => {
    if (i % 2 === 0) html += "<tr>";
    html += `
      <td width="50%" style="padding:0 ${i%2===0?'6px 12px 0':'0 12px 6px'};
                             vertical-align:top">
        <div style="background:#0f1e36;border-radius:8px;
                    padding:12px;border-left:3px solid ${col}">
          <div style="font-size:18px;margin-bottom:6px">${icon}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;
                      font-weight:700;color:${col};margin-bottom:3px">
            ${title}
          </div>
          <div style="font-family:Arial,sans-serif;font-size:11px;
                      color:${T3};line-height:1.4">${desc}</div>
        </div>
      </td>`;
    if (i % 2 === 1) html += "</tr>";
    return html;
  }, "");

  const rows = emailHeader(
    "Welcome, Engageneer.",
    "You just joined something that has never existed before.",
    GOLD
  ) + `
  <tr><td style="background:${NAVY2};padding:30px 40px">
    <p style="font-family:Arial,sans-serif;font-size:16px;
              color:${CREAM};margin:0 0 16px">
      Dear ${name},
    </p>
    <p style="font-family:Arial,sans-serif;font-size:15px;
              color:${T2};line-height:1.7;margin:0 0 20px">
      On ${join_date}, you became part of the world's first
      scored video crowd learning community. No platform like this
      has existed before today.
    </p>
    <div style="background:#0f1e36;border-radius:10px;
                padding:20px 24px;text-align:center;
                border:1px solid #1e3a5a;margin-bottom:20px">
      <div style="font-family:Georgia,serif;font-size:11px;
                  color:${GOLD};letter-spacing:2px;
                  text-transform:uppercase;margin-bottom:8px">
        YOUR ENTRY TIER
      </div>
      <div style="font-family:Georgia,serif;font-size:32px;
                  font-weight:700;color:${tc};margin-bottom:4px">
        Tier ${tier_num} — ${tier_name}
      </div>
      <div style="background:${tc};height:3px;border-radius:2px;
                  width:50%;margin:10px auto 0"></div>
    </div>
    <div style="font-family:Georgia,serif;font-size:16px;
                color:${CREAM};font-weight:700;margin-bottom:14px">
      The Six Pillars of Engageneering™
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0"
           border="0" width="100%">
      ${pillarGrid}
    </table>
    <div style="margin-top:20px">
      ${[
        ["1",GOLD,  "Ask your first video question",
         "Record up to 60 seconds. Select your language. Be genuinely curious."],
        ["2",TEAL,  "Answer one question in the feed",
         "Three minutes. Your real voice. Your genuine understanding."],
        ["3",PURP,  "Check your CDS after your first answer",
         "Six dimensions. One score. Your intellectual reputation begins here."],
      ].map(([n,c,t,d]) => `
        <div style="display:flex;align-items:flex-start;
                    margin-bottom:14px">
          <div style="background:${c};color:#04090f;font-family:Georgia,serif;
                      font-size:13px;font-weight:700;min-width:26px;height:26px;
                      border-radius:50%;text-align:center;line-height:26px;
                      margin-right:12px;flex-shrink:0">${n}</div>
          <div>
            <div style="font-family:Arial,sans-serif;font-size:14px;
                        font-weight:700;color:${CREAM};margin-bottom:2px">
              ${t}</div>
            <div style="font-family:Arial,sans-serif;font-size:12px;
                        color:${T3};line-height:1.5">${d}</div>
          </div>
        </div>`).join("")}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0"
           border="0" style="margin:24px auto 0">
      <tr>
        <td style="background:${GOLD};border-radius:6px;text-align:center">
          <a href="${PLATFORM_URL}"
             style="display:inline-block;padding:14px 36px;
                    font-family:Arial,sans-serif;font-size:15px;
                    font-weight:700;color:#04090f;text-decoration:none">
            Open the Platform →
          </a>
        </td>
      </tr>
    </table>
  </td></tr>` + emailFooter();

  return {
    subject: `Welcome to Engageneering™, ${name}. Your journey begins now.`,
    html: wrap(rows, `Welcome, ${name}. You just joined the world's first scored video crowd learning platform.`)
  };
}

function buildQuestionScored(data) {
  const {
    name, question_title, language = "English",
    quality_score = 72, clarity = 18, depth = 16,
    originality = 18, engagement_potential = 20,
    gatekeeper_verdict = "approved", matched_count = 3,
    feedback = "", question_url = PLATFORM_URL
  } = data;

  const score_color = quality_score>=80 ? TEAL : quality_score>=60 ? GOLD : "#e8904a";
  const score_label = quality_score>=80 ? "Excellent" : quality_score>=65 ? "Good" : "Developing";
  const v_color = gatekeeper_verdict==="approved" ? TEAL : RED;
  const v_text  = gatekeeper_verdict==="approved" ? "✓ Approved &amp; Published" : "⚠ Flagged for Review";

  const dims = [
    ["Clarity",             clarity,             "#5b9bd5"],
    ["Depth",               depth,               PURP],
    ["Originality",         originality,         GOLD],
    ["Engagement Potential",engagement_potential,TEAL],
  ];

  const scores = {Clarity:clarity,Depth:depth,
                  Originality:originality,"Engagement Potential":engagement_potential};
  const weakest = Object.entries(scores).sort((a,b)=>a[1]-b[1])[0][0];
  const recs = {
    "Clarity":              ["Make the gap explicit",
                             "Try 'I know X but I don't understand why Y' — a stronger frame than a general question."],
    "Depth":                ["Go one level deeper",
                             "Ask why, not what. Depth questions seek understanding, not recall."],
    "Originality":          ["Add your specific context",
                             "One sentence of context anchors your question and makes it uniquely yours."],
    "Engagement Potential": ["Create the information gap first",
                             "Give the answerer one line that makes them feel the tension before you ask."],
  };
  const [rec_title, rec_body] = recs[weakest] || ["Keep going", "Each question is practice."];

  const rows = emailHeader(
    "Your question has been scored.",
    "ARIA has completed its analysis of your video question.",
    "#5b9bd5"
  ) + `
  <tr><td style="background:${NAVY2};padding:30px 40px">
    <p style="font-family:Arial,sans-serif;font-size:15px;
              color:${T2};margin:0 0 16px">Hello ${name},</p>
    <div style="background:#0f1e36;border-radius:8px;
                padding:14px 18px;margin-bottom:18px;
                border-left:4px solid ${v_color}">
      <div style="font-family:Arial,sans-serif;font-size:11px;
                  color:${v_color};font-weight:700;letter-spacing:1px;
                  margin-bottom:5px">GATEKEEPER VERDICT</div>
      <div style="font-family:Arial,sans-serif;font-size:15px;
                  color:${CREAM};font-weight:700">${v_text}</div>
      <div style="font-family:Arial,sans-serif;font-size:12px;
                  color:${T3};margin-top:3px">
        Language: ${language} &nbsp;·&nbsp; ${matched_count} Answerers matched
      </div>
    </div>
    <div style="font-family:Arial,sans-serif;font-size:11px;
                color:${T4};text-transform:uppercase;
                letter-spacing:1px;margin-bottom:6px">Your Question</div>
    <div style="font-family:Georgia,serif;font-size:15px;
                color:${CREAM};font-style:italic;
                border-left:3px solid ${GOLD};
                padding:10px 14px;background:#0f1e36;
                border-radius:0 8px 8px 0;margin-bottom:20px">
      "${question_title}"
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0"
           border="0" width="100%">
      <tr>
        <td style="vertical-align:middle">
          <div style="font-family:Georgia,serif;font-size:17px;
                      color:${CREAM};font-weight:700">
            Question Quality Score
          </div>
          <div style="font-family:Arial,sans-serif;font-size:12px;
                      color:${T3}">Rated across 4 dimensions</div>
        </td>
        <td align="right" style="vertical-align:middle">
          <div style="width:72px;height:72px;border-radius:50%;
                      background:#0f1e36;border:3px solid ${score_color};
                      text-align:center;line-height:66px">
            <span style="font-family:Georgia,serif;font-size:22px;
                         font-weight:700;color:${score_color}">
              ${quality_score}
            </span>
          </div>
          <div style="font-family:Arial,sans-serif;font-size:11px;
                      color:${score_color};text-align:center;
                      margin-top:3px;font-weight:700">${score_label}</div>
        </td>
      </tr>
    </table>
    <div style="margin-top:20px">
      ${dims.map(([l,s,c]) => scoreBar(l, s*4, c)).join("")}
    </div>
    <div style="background:#0f1e36;border-radius:8px;
                padding:14px 18px;margin:18px 0;
                border:1px solid #1e3a5a">
      <div style="font-family:Georgia,serif;font-size:14px;
                  color:${CREAM};font-weight:700;margin-bottom:6px">
        💬 ARIA's Feedback
      </div>
      <div style="font-family:Arial,sans-serif;font-size:13px;
                  color:${T2};line-height:1.7">${feedback}</div>
    </div>
    <div style="background:linear-gradient(135deg,#0a1628,#0f1e36);
                border-radius:8px;padding:18px 20px;
                border:1px solid ${GOLD}">
      <div style="font-family:Arial,sans-serif;font-size:10px;
                  color:${GOLD};letter-spacing:2px;
                  text-transform:uppercase;margin-bottom:6px">
        💡 ARIA RECOMMENDATION
      </div>
      <div style="font-family:Georgia,serif;font-size:15px;
                  color:${CREAM};font-weight:700;margin-bottom:6px">
        ${rec_title}
      </div>
      <div style="font-family:Arial,sans-serif;font-size:13px;
                  color:${T2};line-height:1.7">${rec_body}</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;
                  color:${T4};margin-top:8px;font-style:italic">
        Focus area: ${weakest} (${scores[weakest]}/25)
      </div>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0"
           border="0" style="margin:22px auto 0">
      <tr>
        <td style="background:${GOLD};border-radius:6px;text-align:center">
          <a href="${question_url}"
             style="display:inline-block;padding:12px 32px;
                    font-family:Arial,sans-serif;font-size:14px;
                    font-weight:700;color:#04090f;text-decoration:none">
            View your question →
          </a>
        </td>
      </tr>
    </table>
  </td></tr>` + emailFooter();

  return {
    subject: `ARIA scored your question: ${quality_score}/100 — ${score_label}`,
    html: wrap(rows, `Your question scored ${quality_score}/100. See your full ARIA breakdown and recommendations.`)
  };
}

function buildAnswerScored(data) {
  const {
    name, question_title,
    ei=68, ri=72, rai=65, coi=70, ai=82,
    ag=71, pg=75, cds=73,
    integrity_level="PASS",
    tier_changed=false, new_tier_name="", new_tier_num=2,
    points_earned=710, feedback="", answer_url=PLATFORM_URL
  } = data;

  const cds_color = cds>=80 ? TEAL : cds>=60 ? GOLD : "#e8904a";
  const cds_label = cds>=85?"Outstanding":cds>=70?"Strong":cds>=50?"Developing":"Needs Work";
  const ig_color  = integrity_level==="PASS" ? TEAL : integrity_level==="WARN" ? GOLD : RED;

  const tier_upgrade = tier_changed ? `
  <div style="background:linear-gradient(135deg,#0a2018,#0f2820);
              border-radius:10px;padding:18px 22px;
              border:2px solid ${TEAL};text-align:center;
              margin-bottom:18px">
    <div style="font-size:28px;margin-bottom:6px">🏆</div>
    <div style="font-family:Arial,sans-serif;font-size:10px;
                color:${TEAL};letter-spacing:2px;
                text-transform:uppercase;margin-bottom:5px">
      TIER UPGRADE
    </div>
    <div style="font-family:Georgia,serif;font-size:20px;
                font-weight:700;color:${TEAL}">
      Tier ${new_tier_num} — ${new_tier_name}
    </div>
  </div>` : "";

  const scores_map = {Engagement:ei,Retention:ri,Applicability:rai,Creativity:coi};
  const weakest = Object.entries(scores_map).sort((a,b)=>a[1]-b[1])[0][0];
  const recs = {
    "Engagement":   ["Engineer the hook",
                     "Open with a reframe — one sentence that makes them see the question differently before you answer it."],
    "Retention":    ["Use one concrete analogy",
                     "Find something the learner already knows and build your explanation around it."],
    "Applicability":["Bridge to action explicitly",
                     "End with 'so tomorrow you can...' — one specific thing they can do with this knowledge."],
    "Creativity":   ["Approach from the unexpected side",
                     "Ask: what would a historian say about this? The most memorable answers come from outside the discipline."],
  };
  const [rec_title, rec_body] = recs[weakest] || ["Keep refining","Each answer builds your reputation."];

  const dims = [
    ["EI — Engagement",    ei,  "#5b9bd5"],
    ["RI — Retention",     ri,  PURP],
    ["RAI — Applicability",rai, GOLD],
    ["COI — Creativity",   coi, "#e8904a"],
    ["AI — Accuracy",      ai,  TEAL],
  ];

  const rows = emailHeader(
    "Your answer has been scored.",
    `ARIA has completed its 5-agent analysis. Your CDS: ${cds}`,
    TEAL
  ) + `
  <tr><td style="background:${NAVY2};padding:30px 40px">
    <p style="font-family:Arial,sans-serif;font-size:15px;
              color:${T2};margin:0 0 16px">Hello ${name},</p>
    ${tier_upgrade}
    <div style="background:#0f1e36;border-radius:8px;
                padding:12px 16px;margin-bottom:16px;
                border-left:4px solid ${ig_color}">
      <div style="font-family:Arial,sans-serif;font-size:11px;
                  color:${ig_color};font-weight:700;letter-spacing:1px">
        INTEGRITY GUARD — ${integrity_level} &nbsp;·&nbsp;
        9 layers checked &nbsp;·&nbsp; +${points_earned} pts
      </div>
    </div>
    <div style="font-family:Arial,sans-serif;font-size:11px;
                color:${T4};text-transform:uppercase;
                letter-spacing:1px;margin-bottom:6px">In response to</div>
    <div style="font-family:Georgia,serif;font-size:14px;
                color:${CREAM};font-style:italic;
                border-left:3px solid ${T4};
                padding:8px 12px;background:#0f1e36;
                border-radius:0 8px 8px 0;margin-bottom:18px">
      "${question_title}"
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0"
           border="0" width="100%">
      <tr>
        <td width="31%" align="center"
            style="background:#0f1e36;border-radius:8px;
                   padding:14px 6px;border-top:3px solid ${GOLD}">
          <div style="font-family:Georgia,serif;font-size:24px;
                      font-weight:700;color:${GOLD}">${ag}</div>
          <div style="font-family:Arial,sans-serif;font-size:10px;
                      color:${T4};margin-top:3px">Agent Grade</div>
          <div style="font-family:Arial,sans-serif;font-size:9px;
                      color:${T4}">60% of CDS</div>
        </td>
        <td width="4%"></td>
        <td width="31%" align="center"
            style="background:#0f1e36;border-radius:8px;
                   padding:14px 6px;border-top:3px solid ${T3}">
          <div style="font-family:Georgia,serif;font-size:24px;
                      font-weight:700;color:${T2}">${pg}</div>
          <div style="font-family:Arial,sans-serif;font-size:10px;
                      color:${T4};margin-top:3px">Peer Grade</div>
          <div style="font-family:Arial,sans-serif;font-size:9px;
                      color:${T4}">40% of CDS</div>
        </td>
        <td width="4%"></td>
        <td width="30%" align="center"
            style="background:linear-gradient(135deg,#0a1628,#0f2028);
                   border-radius:8px;padding:14px 6px;
                   border:2px solid ${cds_color}">
          <div style="font-family:Georgia,serif;font-size:28px;
                      font-weight:700;color:${cds_color}">${cds}</div>
          <div style="font-family:Arial,sans-serif;font-size:11px;
                      color:${cds_color};font-weight:700;margin-top:3px">
            CDS
          </div>
          <div style="font-family:Arial,sans-serif;font-size:9px;
                      color:${T4}">${cds_label}</div>
        </td>
      </tr>
    </table>
    <div style="font-family:Arial,sans-serif;font-size:10px;
                color:${T4};text-align:center;margin:8px 0 20px">
      CDS = AG × 0.60 + PG × 0.40
    </div>
    <div style="font-family:Georgia,serif;font-size:16px;
                color:${CREAM};font-weight:700;margin-bottom:14px">
      5-Agent Scoring Breakdown
    </div>
    ${dims.map(([l,s,c]) => scoreBar(l, s, c)).join("")}
    <div style="background:#0f1e36;border-radius:8px;
                padding:14px 18px;margin:18px 0;
                border:1px solid #1e3a5a">
      <div style="font-family:Georgia,serif;font-size:14px;
                  color:${CREAM};font-weight:700;margin-bottom:6px">
        💬 ARIA's Feedback
      </div>
      <div style="font-family:Arial,sans-serif;font-size:13px;
                  color:${T2};line-height:1.7">${feedback}</div>
    </div>
    <div style="background:linear-gradient(135deg,#0a1628,#0f1e36);
                border-radius:8px;padding:18px 20px;
                border:1px solid ${TEAL}">
      <div style="font-family:Arial,sans-serif;font-size:10px;
                  color:${TEAL};letter-spacing:2px;
                  text-transform:uppercase;margin-bottom:6px">
        💡 ARIA RECOMMENDATION
      </div>
      <div style="font-family:Georgia,serif;font-size:15px;
                  color:${CREAM};font-weight:700;margin-bottom:6px">
        ${rec_title}
      </div>
      <div style="font-family:Arial,sans-serif;font-size:13px;
                  color:${T2};line-height:1.7">${rec_body}</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;
                  color:${T4};margin-top:8px;font-style:italic">
        Focus area: ${weakest} (${scores_map[weakest]}/100)
      </div>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0"
           border="0" style="margin:22px auto 0">
      <tr>
        <td style="background:${TEAL};border-radius:6px;text-align:center">
          <a href="${answer_url}"
             style="display:inline-block;padding:12px 32px;
                    font-family:Arial,sans-serif;font-size:14px;
                    font-weight:700;color:#fff;text-decoration:none">
            View your answer →
          </a>
        </td>
      </tr>
    </table>
  </td></tr>` + emailFooter();

  return {
    subject: `Your answer CDS: ${cds} — ${cds_label}. Full ARIA breakdown inside.`,
    html: wrap(rows, `Your answer CDS: ${cds}. ${cds_label}. ARIA has completed its 5-agent scoring.`)
  };
}

function buildInactive(data) {
  const {
    name, days_inactive = 14, last_cds,
    tier_name = "", unanswered_questions = 7,
    featured_question = "", featured_language = "English",
    profile_url = PLATFORM_URL
  } = data;

  const cds_block = last_cds ? `
  <div style="background:#0f1e36;border-radius:8px;
              padding:12px 16px;margin-bottom:16px;
              border-left:4px solid ${last_cds>=80?TEAL:last_cds>=60?GOLD:"#e8904a"}">
    <div style="font-family:Arial,sans-serif;font-size:11px;
                color:${T4};text-transform:uppercase;
                letter-spacing:1px;margin-bottom:4px">Your last CDS score</div>
    <div style="font-family:Georgia,serif;font-size:28px;
                font-weight:700;
                color:${last_cds>=80?TEAL:last_cds>=60?GOLD:"#e8904a"}">
      ${last_cds}
    </div>
    <div style="font-family:Arial,sans-serif;font-size:12px;
                color:${T3};margin-top:3px">Pick up where you left off.</div>
  </div>` : "";

  const rows = emailHeader(
    "A question is waiting for you.",
    `You haven't visited in ${days_inactive} days. The community has.`,
    PURP
  ) + `
  <tr><td style="background:${NAVY2};padding:30px 40px">
    <p style="font-family:Arial,sans-serif;font-size:15px;
              color:${T2};line-height:1.7;margin:0 0 16px">
      Hello ${name},
    </p>
    <p style="font-family:Arial,sans-serif;font-size:15px;
              color:${T2};line-height:1.7;margin:0 0 18px">
      We are not writing to ask where you have been.
      Life happens. Curiosity doesn't disappear — it just waits.
    </p>
    ${cds_block}
    <div style="font-family:Georgia,serif;font-size:15px;
                font-style:italic;color:${CREAM};
                border-left:4px solid ${PURP};
                padding:12px 16px;background:#0f1e36;
                border-radius:0 8px 8px 0;margin-bottom:20px">
      <div style="font-family:Arial,sans-serif;font-size:10px;
                  color:${T4};letter-spacing:1px;
                  text-transform:uppercase;margin-bottom:6px">
        Featured question — waiting for your answer
      </div>
      "${featured_question}"
      <div style="font-family:Arial,sans-serif;font-size:11px;
                  color:${T4};margin-top:5px">
        Language: ${featured_language}
      </div>
    </div>
    ${[
      ["🎙️","#1a2a10",`${unanswered_questions} questions are waiting`,
       "in the feed right now — for someone like you to answer."],
      ["📈",NAVY3,"Your CDS doesn't decay while you're away",
       "but it can only grow when you contribute."],
      ["🔔","#1a102a","New answers may have arrived on your questions",
       "someone may have illuminated something for you."],
    ].map(([e,bg,bold,rest]) => `
      <div style="display:flex;align-items:flex-start;margin-bottom:14px">
        <div style="font-size:20px;margin-right:12px;
                    flex-shrink:0;margin-top:2px">${e}</div>
        <div style="font-family:Arial,sans-serif;font-size:13px;
                    color:${T2};line-height:1.6">
          <strong style="color:${CREAM}">${bold}</strong> ${rest}
        </div>
      </div>`).join("")}
    <div style="font-family:Georgia,serif;font-size:15px;
                color:${CREAM};font-weight:700;
                margin:20px 0 14px">
      You don't need much time.
    </div>
    ${[
      ["🎙️","3 minutes to ask a question",
       "60 seconds to record. Select your language. Ask what you genuinely don't understand."],
      ["⚡","5 minutes to give an answer",
       "Find a question in the feed. 180 seconds. Your real voice."],
      ["👁","30 seconds to see what changed",
       "Someone may have answered your question while you were away."],
    ].map(([e,t,d]) => `
      <div style="display:flex;align-items:flex-start;margin-bottom:12px">
        <div style="font-size:18px;margin-right:12px;
                    flex-shrink:0;margin-top:2px">${e}</div>
        <div>
          <div style="font-family:Arial,sans-serif;font-size:13px;
                      font-weight:700;color:${CREAM}">${t}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;
                      color:${T3};line-height:1.4;margin-top:2px">${d}</div>
        </div>
      </div>`).join("")}
    <table role="presentation" cellpadding="0" cellspacing="0"
           border="0" style="margin:22px auto 0">
      <tr>
        <td style="background:${PURP};border-radius:6px;text-align:center">
          <a href="${PLATFORM_URL}"
             style="display:inline-block;padding:12px 32px;
                    font-family:Arial,sans-serif;font-size:14px;
                    font-weight:700;color:#fff;text-decoration:none">
            Return to Engageneering™ →
          </a>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin-top:24px;
                font-family:Georgia,serif;font-size:14px;
                font-style:italic;color:${T3};line-height:1.8">
      "Curiosity does not decay.<br>It waits."
    </div>
  </td></tr>` + emailFooter();

  return {
    subject: `A question is waiting for you, ${name}.`,
    html: wrap(rows, `It's been ${days_inactive} days. ${unanswered_questions} questions are waiting. Come back when you're ready.`)
  };
}

// ════════════════════════════════════════════════════════════════
// SEND VIA RESEND
// ════════════════════════════════════════════════════════════════
async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      reply_to: REPLY_TO,
      to: [to],
      subject,
      html,
    }),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(result)}`);
  return result;
}

// ════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { type, to, data } = await req.json();

    if (!type || !to || !data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, to, data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let email;
    switch (type) {
      case "welcome":          email = buildWelcome(data);        break;
      case "question_scored":  email = buildQuestionScored(data); break;
      case "answer_scored":    email = buildAnswerScored(data);   break;
      case "inactive":         email = buildInactive(data);       break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const result = await sendEmail(to, email.subject, email.html);

    return new Response(
      JSON.stringify({ success: true, id: result.id, type, to }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
