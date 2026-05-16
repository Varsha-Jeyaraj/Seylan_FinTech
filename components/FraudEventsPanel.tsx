'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface FraudEvent {
  id: string;
  user_id: string;
  fraud_score: number;
  risk_level: string;
  gateway_decision: string;
  created_at: string;
}

export default function FraudEventsPanel() {
  const [events, setEvents] = useState<FraudEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fraud_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('[v0] Error loading fraud events:', error);
    } finally {
      setLoading(false);
    }
  }

  function setupRealtime() {
    const channelName = `fraud_events_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fraud_events' },
        (payload) => {
          setEvents((prev) => [payload.new as FraudEvent, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getDecisionColor = (decision: string) => {
    return decision === 'BLOCK'
      ? 'bg-red-600'
      : decision === 'REVIEW'
        ? 'bg-yellow-600'
        : 'bg-green-600';
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Fraud Events</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400">Loading fraud events...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white">Fraud Detection Events</CardTitle>
            <CardDescription>Recent fraud detection decisions</CardDescription>
          </div>
          <Badge className="bg-purple-600 text-white">{events.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No fraud events detected</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">
                      Fraud Score: {Math.round(event.fraud_score * 100)}%
                    </span>
                    <Badge className={getRiskColor(event.risk_level)}>
                      {event.risk_level.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge className={`${getDecisionColor(event.gateway_decision)} text-white`}>
                  {event.gateway_decision}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
