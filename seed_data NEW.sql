-- ══════════════════════════════════════════════════════════════
-- ENGAGENEERING™ — Seed Data v1.1
-- 10 Questions · 12 Answers · 8 Domains · 3 Languages
-- Fixed: removed created_at and cds_last (not in schema)
-- Safe to re-run — uses ON CONFLICT DO NOTHING
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. PROFILES ──────────────────────────────────────────────
-- Only columns that exist: id, display_name, status
INSERT INTO profiles (id, display_name, status)
VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001','Arjun Mehta',       'active'),
  ('a1b2c3d4-0002-0000-0000-000000000002','Sarah Kovacs',      'active'),
  ('a1b2c3d4-0003-0000-0000-000000000003','Kwame Asante',      'active'),
  ('a1b2c3d4-0004-0000-0000-000000000004','Priya Nair',        'active'),
  ('a1b2c3d4-0005-0000-0000-000000000005','Marcus Thompson',   'active'),
  ('a1b2c3d4-0006-0000-0000-000000000006','Fatima Al-Rashid',  'active'),
  ('a1b2c3d4-0007-0000-0000-000000000007','Lena Vogt',         'active'),
  ('a1b2c3d4-0008-0000-0000-000000000008','Mei Lin',           'active'),
  ('a1b2c3d4-0009-0000-0000-000000000009','Ravi Shankar',      'active'),
  ('a1b2c3d4-0010-0000-0000-000000000010','Ananya Krishnan',   'active')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- ── 2. PROFILE ROLES ─────────────────────────────────────────
-- Only columns that exist: user_id, role, seeker_tier, answerer_tier,
-- pts_total, seeker_pts, answerer_pts, expertise_tags
INSERT INTO profile_roles (
  user_id, role, seeker_tier, answerer_tier,
  pts_total, seeker_pts, answerer_pts, expertise_tags
) VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001','both',    2,3,4200,1800,2400,ARRAY['Science','Physics','Teaching']),
  ('a1b2c3d4-0002-0000-0000-000000000002','answerer',1,4,6800,0,   6800,ARRAY['Science','Mathematics','Neuroscience']),
  ('a1b2c3d4-0003-0000-0000-000000000003','answerer',1,4,7200,0,   7200,ARRAY['History','Economics','Philosophy']),
  ('a1b2c3d4-0004-0000-0000-000000000004','both',    2,2,2800,1200,1600,ARRAY['Mathematics','Philosophy','Logic']),
  ('a1b2c3d4-0005-0000-0000-000000000005','answerer',1,3,3900,0,   3900,ARRAY['Philosophy','History','Critical Thinking']),
  ('a1b2c3d4-0006-0000-0000-000000000006','both',    3,3,5100,2200,2900,ARRAY['Psychology','Economics','Teaching']),
  ('a1b2c3d4-0007-0000-0000-000000000007','seeker',  3,1,1800,1800,0,   ARRAY['History','Programming','Teaching']),
  ('a1b2c3d4-0008-0000-0000-000000000008','both',    2,3,4500,1900,2600,ARRAY['Programming','Computer Science','Teaching']),
  ('a1b2c3d4-0009-0000-0000-000000000009','both',    3,2,3200,1800,1400,ARRAY['Teaching','Hindi','Education']),
  ('a1b2c3d4-0010-0000-0000-000000000010','seeker',  2,1,1400,1400,0,   ARRAY['Teaching','Tamil','Philosophy of Education'])
ON CONFLICT (user_id) DO UPDATE SET
  seeker_tier   = EXCLUDED.seeker_tier,
  answerer_tier = EXCLUDED.answerer_tier,
  pts_total     = EXCLUDED.pts_total;

-- ── 3. QUESTIONS ─────────────────────────────────────────────
INSERT INTO questions (
  id, asker_id, text, content_type, tags,
  quality_score, gatekeeper_verdict, status,
  language, language_name, views, answer_count, bounty_pts,
  created_at, published_at
) VALUES
('b0000000-0001-0000-0000-000000000001','a1b2c3d4-0001-0000-0000-000000000001',
 'How do you explain entropy to a 12-year-old without using the word disorder?',
 'video',ARRAY['Science','Physics','Teaching'],94,'approved','published','en','English',312,2,50,NOW()-INTERVAL '40 days',NOW()-INTERVAL '40 days'),

('b0000000-0002-0000-0000-000000000002','a1b2c3d4-0007-0000-0000-000000000007',
 'Why did the Roman Empire fall — explained to someone who thinks history is boring?',
 'video',ARRAY['History','Ancient Rome','Storytelling'],89,'approved','published','en','English',287,1,30,NOW()-INTERVAL '35 days',NOW()-INTERVAL '35 days'),

('b0000000-0003-0000-0000-000000000003','a1b2c3d4-0004-0000-0000-000000000004',
 'Why does 0.999… equal exactly 1 — and how do you convince a sceptic without using algebra?',
 'video',ARRAY['Mathematics','Logic','Critical Thinking'],91,'approved','published','en','English',445,1,40,NOW()-INTERVAL '30 days',NOW()-INTERVAL '30 days'),

('b0000000-0004-0000-0000-000000000004','a1b2c3d4-0001-0000-0000-000000000001',
 'Can you explain Occam''s Razor using one concrete example from everyday decision-making?',
 'video',ARRAY['Philosophy','Critical Thinking','Logic'],87,'approved','published','en','English',198,1,0,NOW()-INTERVAL '26 days',NOW()-INTERVAL '26 days'),

('b0000000-0005-0000-0000-000000000005','a1b2c3d4-0008-0000-0000-000000000008',
 'What is the real difference between motivation and discipline — and which one should we actually be building?',
 'video',ARRAY['Psychology','Self-Improvement','Education'],92,'approved','published','en','English',523,2,60,NOW()-INTERVAL '22 days',NOW()-INTERVAL '22 days'),

('b0000000-0006-0000-0000-000000000006','a1b2c3d4-0009-0000-0000-000000000009',
 'कक्षा में जिज्ञासा कैसे जगाएं जब छात्र बिल्कुल रुचि नहीं दिखाते?',
 'video',ARRAY['Teaching','Curiosity','Education'],86,'approved','published','hi','Hindi',234,1,35,NOW()-INTERVAL '18 days',NOW()-INTERVAL '18 days'),

('b0000000-0007-0000-0000-000000000007','a1b2c3d4-0006-0000-0000-000000000006',
 'Why does inflation hurt the poor more than the rich — even when prices rise equally for everyone?',
 'video',ARRAY['Economics','Social Justice','Finance'],90,'approved','published','en','English',367,1,45,NOW()-INTERVAL '15 days',NOW()-INTERVAL '15 days'),

('b0000000-0008-0000-0000-000000000008','a1b2c3d4-0007-0000-0000-000000000007',
 'How would you explain recursion to someone who has never written a single line of code?',
 'video',ARRAY['Programming','Computer Science','Teaching'],88,'approved','published','en','English',289,1,25,NOW()-INTERVAL '12 days',NOW()-INTERVAL '12 days'),

('b0000000-0009-0000-0000-000000000009','a1b2c3d4-0010-0000-0000-000000000010',
 'ஒரு மாணவன் கேட்கும் கேள்வி எப்படி ஆசிரியரையே மாற்றிவிடுகிறது?',
 'video',ARRAY['Teaching','Tamil','Philosophy of Education'],85,'approved','published','ta','Tamil',178,1,20,NOW()-INTERVAL '9 days',NOW()-INTERVAL '9 days'),

('b0000000-0010-0000-0000-000000000010','a1b2c3d4-0004-0000-0000-000000000004',
 'Why do we remember embarrassing moments far more vividly than our greatest achievements?',
 'video',ARRAY['Neuroscience','Psychology','Memory'],93,'approved','published','en','English',412,2,55,NOW()-INTERVAL '6 days',NOW()-INTERVAL '6 days')

ON CONFLICT (id) DO NOTHING;

-- ── 4. ANSWERS ────────────────────────────────────────────────
INSERT INTO answers (
  question_id, answerer_id, text, content_type, language, language_name,
  ei_score, ri_score, rai_score, coi_score, ai_score,
  ag, pg, cds, integrity_pass, status, scored_at, created_at
) VALUES

('b0000000-0001-0000-0000-000000000001','a1b2c3d4-0002-0000-0000-000000000002',
'Think of your bedroom on a Monday morning after a week of school. It is tidy. Now imagine you live in it for a month without deliberately tidying. What happens? It does not stay tidy. Things drift toward messiness on their own — you never have to try to make it messy.

Entropy is that tendency. The universe moves from states that are rare and specific toward states that are common and spread out. A tidy bedroom is one specific arrangement out of millions. A messy bedroom is any of those millions of arrangements. There are so many more ways to be messy than to be tidy that, left alone, things drift toward messy.

The same principle explains why ice melts, why perfume spreads across a room, why you cannot unscramble an egg. Each of those is the universe moving from a specific, rare arrangement toward a common, spread-out one.

The reason your bedroom does not tidy itself is the same reason the universe does not run backwards. It is not impossible — it is just so unlikely that in all the time the universe has existed, it has never happened spontaneously.',
'video','en','English',88,92,85,90,95,90,92,91,TRUE,'published',NOW()-INTERVAL '39 days',NOW()-INTERVAL '39 days'),

('b0000000-0002-0000-0000-000000000002','a1b2c3d4-0003-0000-0000-000000000003',
'Rome did not fall. It got tired.

For 500 years, Rome worked because it had a deal with its people: we give you roads, clean water, law, and safety. You give us taxes and soldiers. That deal held.

Then three things broke it simultaneously. First, the army became too expensive. To pay soldiers, emperors debased the currency — put less silver in the coins. Prices went up. People trusted the government less.

Second, the borders became impossible to defend. The empire was so large that by the time news of an attack reached the centre, the attack was already over. Emperors split power between co-rulers. Those rulers fought each other.

Third — and most importantly — people stopped believing Rome was worth defending. When Germanic tribes arrived, many Roman citizens did not fight. They watched. The idea of Rome had stopped meaning anything to the people supposed to uphold it.

Rome did not collapse because it was defeated. It collapsed because it stopped being something people were willing to die for. Sound familiar?',
'video','en','English',91,94,88,96,90,92,94,93,TRUE,'published',NOW()-INTERVAL '34 days',NOW()-INTERVAL '34 days'),

('b0000000-0003-0000-0000-000000000003','a1b2c3d4-0002-0000-0000-000000000002',
'The sceptic is right to feel strange — it feels like 0.999… is forever chasing 1 and never quite reaching it. But that feeling comes from thinking about the process of writing the number, not the number itself.

0.999… is not a process. It is a completed value. All the nines are already there. It is not approaching 1. It already is whatever it is.

Now: what number sits between 0.999… and 1? Try to name it. You cannot. In mathematics, two different real numbers always have something between them. If there is nothing between them, they are the same number.

A different way: take 1 divided by 3. That is 0.333… Multiply by 3. You get 1. But you also get 0.999… So 0.999… equals 1.

0.999… and 1 are two different names for the same address on the number line.',
'video','en','English',89,93,86,92,97,91,90,91,TRUE,'published',NOW()-INTERVAL '29 days',NOW()-INTERVAL '29 days'),

('b0000000-0004-0000-0000-000000000004','a1b2c3d4-0005-0000-0000-000000000005',
'You come home and find the biscuit tin is empty.

Two explanations: one — your flatmate ate them. Two — a sophisticated biscuit thief broke in, stole only the biscuits, left no trace, and locked the door perfectly on the way out.

Both fit the evidence. But the first requires one assumption: your flatmate was hungry. The second requires a dozen: thief exists, has specific biscuit interest, has expert lock skills, chose your house, left nothing else.

Occam''s Razor: when two explanations fit the evidence equally well, prefer the one that requires fewer assumptions. Every extra assumption is a new way to be wrong. Add them only when the evidence demands it.

Doctors use this every day. When a patient has a cough, fever, and fatigue, they look for one disease explaining all three — not three separate diseases each explaining one symptom.',
'video','en','English',87,90,89,88,94,89,88,89,TRUE,'published',NOW()-INTERVAL '25 days',NOW()-INTERVAL '25 days'),

('b0000000-0005-0000-0000-000000000005','a1b2c3d4-0003-0000-0000-000000000003',
'Motivation is the feeling that makes you want to start. Discipline is the system that makes you continue when the feeling is gone.

The mistake most people make is building their lives around motivation. They wait until they feel like going to the gym. They wait until they feel inspired to study. They build their productivity on top of a feeling — and feelings are weather. They change without warning.

Discipline is infrastructure. It does not care how you feel. A professional writer writes on days they hate writing. A surgeon operates on days they are tired. They do this not because they are superhuman — but because they have built systems that make the behaviour happen regardless of the emotional state.

Build the system. The feeling will follow — or it will not, and you will do the work anyway.',
'video','en','English',93,91,95,89,92,92,95,93,TRUE,'published',NOW()-INTERVAL '21 days',NOW()-INTERVAL '21 days'),

('b0000000-0005-0000-0000-000000000005','a1b2c3d4-0006-0000-0000-000000000006',
'Motivation asks: do I feel like doing this? Discipline asks: have I decided to do this? These are completely different questions — and the first one is a trap.

Our brains are built for novelty, pleasure, and the avoidance of discomfort. Motivation leverages excitement and anticipation of reward. But excitement fades. Every project has a phase where the novelty is gone and only the work remains. Discipline is what you have built for that phase.

Research on habit formation shows approximately 43% of daily behaviours happen with little conscious thought — not through willpower, but because the environment has been designed to trigger them automatically.

That is the goal: design your environment so that the disciplined behaviour becomes the path of least resistance. Not willpower. Architecture. Put your running shoes next to your bed. Make the hard thing easy to start.',
'video','en','English',88,86,90,84,91,88,86,87,TRUE,'published',NOW()-INTERVAL '20 days',NOW()-INTERVAL '20 days'),

('b0000000-0006-0000-0000-000000000006','a1b2c3d4-0009-0000-0000-000000000009',
'जिज्ञासा जगाने के लिए सबसे पहले एक ज़रूरी काम करना होगा — उत्तर देना बंद करें, और प्रश्न पूछना शुरू करें।

जब हम पहले उत्तर देते हैं, तो छात्र के मन में वह खालीपन ही नहीं आता जो जिज्ञासा को जन्म देता है। जिज्ञासा तब होती है जब मन कुछ जानना चाहे, लेकिन अभी जानता न हो।

उदाहरण: अगर आप बताएं "पानी 100 डिग्री पर उबलता है" — छात्र सुनेगा, लिखेगा, भूल जाएगा। लेकिन अगर पहले पूछें "क्या आपने कभी सोचा है कि पहाड़ पर चाय ठीक से गर्म क्यों नहीं होती?" — तो मन में एक सवाल खड़ा होगा। उस सवाल का जवाब अब छात्र खुद चाहेगा।

जिज्ञासा बाहर से नहीं लाई जाती — वह पहले से अंदर होती है। हमारा काम है उसके लिए दरवाज़ा खोलना।',
'video','hi','Hindi',85,88,84,86,90,87,88,87,TRUE,'published',NOW()-INTERVAL '17 days',NOW()-INTERVAL '17 days'),

('b0000000-0007-0000-0000-000000000007','a1b2c3d4-0003-0000-0000-000000000003',
'Imagine two people. One earns 20,000 rupees a month. The other earns 200,000.

Food prices rise 10%. Both pay more. But for the first person, food is 60% of their budget — a 10% rise in food is a 6% hit to their entire income. For the second person, food is 10% of their budget — the same rise is only a 1% hit.

Same price change. Drastically different impact. Economists call this the expenditure share effect.

But it goes deeper. Wealthier people hold assets — property, stocks, gold. Inflation raises asset prices too. So while their grocery bill rises, their net worth often rises faster. The poor hold cash. Cash loses value during inflation.

Third: central banks raise interest rates to fight inflation. Rich people have savings — they earn more interest. Poor people have debt — they pay more interest.

Inflation hits the poor three ways simultaneously. The rich face one headwind. The poor face three.',
'video','en','English',92,90,94,87,96,92,93,92,TRUE,'published',NOW()-INTERVAL '14 days',NOW()-INTERVAL '14 days'),

('b0000000-0008-0000-0000-000000000008','a1b2c3d4-0008-0000-0000-000000000008',
'Stand between two mirrors facing each other. Look at your reflection. You will see a reflection of a reflection of a reflection, going back until it is too small to see.

Each mirror does exactly the same thing: reflects what is in front of it. Because what is in front of it is another mirror doing the same thing, you get depth. The mirror does not need special instructions for the 100th reflection. It just does its one job, and the repetition creates the depth.

Recursion in programming is exactly this. You write a function that does one simple job — but part of that job involves calling itself on a smaller version of the problem.

Counting down from 10: to count from 10, say 10, then count from 9. To count from 9, say 9, then count from 8. Until you reach 1, where you just say 1 and stop. That stopping point — the base case — is crucial. Without it, the mirrors go on forever, which in programming means the computer crashes.

Two mirrors. One rule. Infinite depth.',
'video','en','English',90,94,88,95,92,92,91,91,TRUE,'published',NOW()-INTERVAL '11 days',NOW()-INTERVAL '11 days'),

('b0000000-0009-0000-0000-000000000009','a1b2c3d4-0010-0000-0000-000000000010',
'ஒரு மாணவன் கேட்கும் கேள்வி, ஆசிரியர் எதிர்பார்க்காத ஒன்றாக இருந்தால், அது ஆசிரியரை ஒரு வினாடி நிறுத்துகிறது. அந்த நிறுத்தம்தான் மாற்றத்தின் தொடக்கம்.

ஏனென்றால், ஆசிரியர் தன் பாடத்தை ஒரு குறிப்பிட்ட கோணத்தில் மட்டுமே பார்த்திருக்கிறார். மாணவன் கேட்கும் கேள்வி வேறொரு கோணத்தில் இருந்து வருகிறது — அவனுடைய அனுபவத்திலிருந்து, அவனுடைய குழப்பத்திலிருந்து.

அந்தக் கேள்வி ஆசிரியரை யோசிக்க வைக்கிறது: நான் இதை புரிந்துகொண்டிருக்கிறேனா, அல்லது மனப்பாடம் செய்திருக்கிறேனா?

உண்மையிலேயே கற்பிக்கும் ஆசிரியர், மாணவனின் கேள்வியை ஒரு சவாலாக எடுத்துக்கொள்வதில்லை — ஒரு கண்ணாடியாக எடுத்துக்கொள்கிறார். அந்தக் கண்ணாடியில் தன்னைப் பார்க்கிறார். அந்தப் பார்வையில் மாறுகிறார்.',
'video','ta','Tamil',84,87,82,88,88,86,85,86,TRUE,'published',NOW()-INTERVAL '8 days',NOW()-INTERVAL '8 days'),

('b0000000-0010-0000-0000-000000000010','a1b2c3d4-0002-0000-0000-000000000002',
'Your brain is not a recording device. It is a threat-detection system that happens to store memories on the side.

Embarrassing moments survive vividly because they trigger your brain''s threat response. Something went wrong socially — which for a species that survived in groups means something potentially dangerous. The amygdala flags it: remember this, avoid this happening again.

Cortisol and adrenaline flood in. These hormones enhance memory consolidation. The more emotionally aroused you are at the moment of an experience, the more vividly your brain encodes it — the flashbulb memory effect.

Your greatest achievements feel good but not urgent. No threat. No alarm. The memory forms without the hormonal enhancement. It fades.

This asymmetry is not a flaw. It is the design. A creature that remembered threats more vividly than pleasures survived. You are descended from the ones who stayed embarrassed. That embarrassment kept them alive long enough to have you.',
'video','en','English',94,96,90,93,97,94,96,95,TRUE,'published',NOW()-INTERVAL '5 days',NOW()-INTERVAL '5 days'),

('b0000000-0010-0000-0000-000000000010','a1b2c3d4-0006-0000-0000-000000000006',
'There is a third layer worth examining beyond neuroscience: the social layer.

We are the most social species on earth. Our survival for 200,000 years depended on belonging to a group. Being excluded meant death. Embarrassment signals: you may have violated a social norm. You may be at risk of exclusion.

That signal needed to be strong enough to change future behaviour. So the brain evolved to encode social mistakes with high fidelity.

Achievements work differently. They are celebrated briefly and become the expected baseline. The community needs you to remember your failures — so you do not repeat behaviours that threaten your belonging — not your successes.

The result is the negativity bias. Research suggests a ratio of roughly 5:1: it takes approximately five positive experiences to counterbalance the psychological weight of one negative one. Knowing this does not remove the embarrassment. But it lets you understand what you are actually dealing with.',
'video','en','English',88,91,86,90,94,90,88,89,TRUE,'published',NOW()-INTERVAL '4 days',NOW()-INTERVAL '4 days')

ON CONFLICT DO NOTHING;

-- ── 5. UPDATE ANSWER COUNTS ──────────────────────────────────
UPDATE questions
SET answer_count = (
  SELECT COUNT(*) FROM answers
  WHERE answers.question_id = questions.id
  AND answers.status = 'published'
)
WHERE id::text LIKE 'b0000000-%';

COMMIT;

-- Verify result
SELECT text, language_name, quality_score, answer_count, views
FROM questions
WHERE id::text LIKE 'b0000000-%'
ORDER BY created_at DESC;
