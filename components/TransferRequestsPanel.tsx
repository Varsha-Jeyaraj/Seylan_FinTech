'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface TransferRequest {
  id: string;
  from_account: string;
  to_account: string;
  amount: number;
  status: string;
  transfer_type: string;
  created_at: string;
}

interface TransferResult {
  seylan_status: string;
  seylan_message: string;
}

export default function TransferRequestsPanel() {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const formatLkr = (amount: number) => `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    loadTransfers();
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  async function loadTransfers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('[v0] Error loading transfers:', error);
    } finally {
      setLoading(false);
    }
  }

  function setupRealtime() {
    const channelName = `transfer_requests_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfer_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransfers((prev) => [payload.new as TransferRequest, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTransfers((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as TransferRequest) : t))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'executed':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Transfer Requests</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400">Loading transfers...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white">Transfer Requests</CardTitle>
            <CardDescription>Recent transfers and their status</CardDescription>
          </div>
          <Badge className="bg-blue-600 text-white">{transfers.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No transfer requests yet</p>
        ) : (
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {transfer.from_account} → {transfer.to_account}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Amount: {formatLkr(transfer.amount)} • {transfer.transfer_type}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(transfer.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge className={getStatusColor(transfer.status)}>
                  {transfer.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
