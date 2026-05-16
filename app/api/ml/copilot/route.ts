/**
 * POST /api/ml/copilot
 *
 * AI Financial Copilot — answers questions about fraud decisions,
 * blocked transfers, and customer behaviour using OpenAI.
 *
 * Falls back to rule-based templated answers when OPENAI_API_KEY is not set.
 */

import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are IntelliBank AI Copilot — an expert financial intelligence assistant for Seylan Bank.

Your role:
- Explain fraud decisions in clear, professional language
- Summarise blocked transfers and their risk factors
- Describe customer behaviour patterns
- Explain product recommendations
- Answer compliance-related questions

Guidelines:
- Be concise and professional (max 3 sentences per answer)
- Use specific numbers from the context when available
- Never reveal raw ML scores directly — use descriptive language
- Maintain banking confidentiality standards
- If you don't know, say so clearly`;

interface CopilotRequest {
  question: string;
  context?: {
    type?: 'fraud_decision' | 'blocked_transfer' | 'customer_profile' | 'recommendation';
    risk_score?: number;
    severity?: string;
    reasons?: string[];
    segment?: string;
    amount?: number;
    transaction_type?: string;
  };
}

// ─── Templated fallback responses ─────────────────────────────────────────────

function generateFallbackAnswer(req: CopilotRequest): string {
  const { question, context } = req;
  const q = question.toLowerCase();

  if (context?.type === 'blocked_transfer' || q.includes('blocked') || q.includes('why')) {
    const reasons = context?.reasons?.slice(0, 2).join(' and ') ?? 'multiple risk signals';
    const amount = context?.amount ? `LKR ${context.amount.toLocaleString()}` : 'this transfer';
    return `${amount} was blocked because ${reasons}. The system assessed elevated risk based on transaction patterns that deviate from this customer's normal behaviour. Contact support to initiate a manual review.`;
  }

  if (context?.type === 'fraud_decision' || q.includes('fraud')) {
    const severity = context?.severity?.toLowerCase() ?? 'elevated';
    return `The transaction was flagged as ${severity} risk by our AI fraud detection system. Key signals included unusual transaction characteristics relative to the customer's historical profile. No action is required if this was a legitimate transaction — the system will learn over time.`;
  }

  if (context?.type === 'customer_profile' || q.includes('customer') || q.includes('behaviour')) {
    const segment = context?.segment ?? 'Standard';
    return `This customer belongs to the ${segment} segment, characterised by consistent transaction patterns and stable account activity. The AI model has profiled their spending behaviour to tailor product recommendations and risk thresholds accordingly.`;
  }

  if (context?.type === 'recommendation' || q.includes('recommend') || q.includes('product')) {
    return `These recommendations are generated based on the customer's spending patterns, savings behaviour, and segment profile. The AI model analyses transaction history to identify products that align with the customer's financial goals and eligibility criteria.`;
  }

  return `Our AI banking intelligence system continuously monitors transactions, customer behaviour, and risk signals to provide real-time fraud protection and personalised financial insights. For specific questions, please provide more context.`;
}

// ─── OpenAI Call ──────────────────────────────────────────────────────────────

async function callOpenAI(question: string, context: CopilotRequest['context']): Promise<string> {
  const contextStr = context
    ? `\n\nContext: ${JSON.stringify(context, null, 2)}`
    : '';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${question}${contextStr}` },
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? 'I was unable to generate a response.';
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: CopilotRequest = await req.json();

    if (!body.question?.trim()) {
      return NextResponse.json({ error: 'Missing required field: question' }, { status: 400 });
    }

    let answer: string;
    let source: 'openai' | 'fallback';

    if (OPENAI_API_KEY) {
      try {
        answer = await callOpenAI(body.question, body.context);
        source = 'openai';
      } catch (err) {
        console.error('[Copilot] OpenAI call failed:', err);
        answer = generateFallbackAnswer(body);
        source = 'fallback';
      }
    } else {
      answer = generateFallbackAnswer(body);
      source = 'fallback';
    }

    return NextResponse.json({
      success: true,
      answer,
      source,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Copilot] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
