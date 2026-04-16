// Supabase Edge Function: /functions/v1/aria-agent
// Deploy via: supabase functions deploy aria-agent
// This proxies Anthropic API calls server-side — fixing the CORS issue

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agent, question, answer, tags } = await req.json()

    const prompts = {
      gatekeeper: {
        system: `You are the Gatekeeper for Engageneering™. Screen questions for harmful or bad-faith content. Return ONLY JSON: {"verdict":"approve"|"revise"|"reject","reason":"one sentence"}. Be generous with genuine curiosity questions on any subject.`,
        user: `Question: "${question}" | Tags: ${tags}`
      },
      question_rater: {
        system: `You are the Question Rater for Engageneering™. Score this question on four axes (0-25 each). Return ONLY JSON: {"clarity":N,"depth":N,"originality":N,"engagement_potential":N,"total":N,"feedback":"one sentence"}.`,
        user: `Question: "${question}" | Tags: ${tags}`
      },
      smart_matcher: {
        system: `You are the Smart Matcher for Engageneering™. Identify best-fit answerers. Return ONLY JSON: {"matched":["Name — Tier","Name — Tier","Name — Tier"],"invite":"one sentence personalised invitation"}.`,
        user: `Question: "${question}" | Tags: ${tags}`
      },
      engagement_indexer: {
        system: `You are the Engagement Indexer for Engageneering™. Score ONLY engagement quality (narrative pull, hooks, questions raised). Return ONLY JSON: {"score":N,"note":"one sentence"} where N is 0-100.`,
        user: `Q:"${question}"\nA:"${answer}"`
      },
      retention_indexer: {
        system: `You are the Retention Indexer for Engageneering™. Score ONLY retention quality (memorable anchors, analogies, sticky phrases). Return ONLY JSON: {"score":N,"note":"one sentence"} where N is 0-100.`,
        user: `Q:"${question}"\nA:"${answer}"`
      },
      applicability_indexer: {
        system: `You are the Applicability Indexer for Engageneering™. Score ONLY real-life applicability (usable tomorrow, concrete steps). Return ONLY JSON: {"score":N,"note":"one sentence"} where N is 0-100.`,
        user: `Q:"${question}"\nA:"${answer}"`
      },
      creativity_indexer: {
        system: `You are the Creativity Indexer for Engageneering™. Score ONLY creativity and originality (novel framing, fresh perspective). Return ONLY JSON: {"score":N,"note":"one sentence"} where N is 0-100.`,
        user: `Q:"${question}"\nA:"${answer}"`
      },
      accuracy_verifier: {
        system: `You are the Accuracy Verifier for Engageneering™. Score ONLY factual accuracy and logical coherence. Return ONLY JSON: {"score":N,"note":"one sentence"} where N is 0-100.`,
        user: `Q:"${question}"\nA:"${answer}"`
      },
      integrity_guard: {
        system: `You are the Integrity Guard for Engageneering™. Check for plagiarism, hallucination, and bad faith. Return ONLY JSON: {"pass":true|false,"note":"one sentence"}.`,
        user: `Answer: "${answer}"`
      }
    }

    const prompt = prompts[agent]
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Unknown agent: ' + agent }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'

    return new Response(text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
