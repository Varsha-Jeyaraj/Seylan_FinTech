'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, Loader2, Sparkles, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'openai' | 'fallback';
}

interface AICopilotProps {
  context?: {
    type?: 'fraud_decision' | 'blocked_transfer' | 'customer_profile' | 'recommendation';
    risk_score?: number;
    severity?: string;
    reasons?: string[];
    segment?: string;
    amount?: number;
    transaction_type?: string;
  };
  defaultOpen?: boolean;
}

// ─── Suggested Questions ──────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Why was this transfer blocked?',
  'Explain the fraud risk score',
  'What does this customer segment mean?',
  'How can I reduce my risk score?',
  'Why was this recommendation made?',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AICopilot({ context, defaultOpen = false }: AICopilotProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m the IntelliBank AI Copilot. I can explain fraud decisions, blocked transfers, customer behaviour, and product recommendations. How can I help?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ml/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text.trim(), context }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer ?? 'I was unable to generate a response. Please try again.',
        timestamp: new Date().toISOString(),
        source: data.source,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-violet-700 hover:bg-violet-600 text-white shadow-lg shadow-violet-900/50 transition-all duration-200 hover:scale-105"
      >
        <Bot className="h-5 w-5" />
        <span className="text-sm font-medium">AI Copilot</span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 shadow-2xl shadow-black/50">
      <Card className="bg-slate-900 border-slate-700 overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-2 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-violet-800 flex items-center justify-center">
                <Bot className="h-4 w-4 text-violet-200" />
              </div>
              <div>
                <CardTitle className="text-sm text-white">IntelliBank Copilot</CardTitle>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  AI-Powered · Seylan Bank
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>

        {/* Messages */}
        <ScrollArea className="h-72">
          <div className="p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                  msg.role === 'assistant' ? 'bg-violet-800' : 'bg-slate-700'
                }`}>
                  {msg.role === 'assistant'
                    ? <Bot className="h-3 w-3 text-violet-300" />
                    : <User className="h-3 w-3 text-slate-300" />
                  }
                </div>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-800 text-violet-100'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}>
                  {msg.content}
                  {msg.source === 'openai' && (
                    <div className="flex items-center gap-1 mt-1 opacity-60">
                      <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                      <span className="text-[10px] text-slate-400">GPT-4o mini</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-violet-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 text-violet-300" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                  <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-[10px] px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 pt-2 border-t border-slate-700 bg-slate-800/50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Ask about fraud, customers, transfers…"
              className="h-8 text-xs bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-violet-500"
              disabled={loading}
            />
            <Button
              size="icon"
              className="h-8 w-8 flex-shrink-0 bg-violet-700 hover:bg-violet-600"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
