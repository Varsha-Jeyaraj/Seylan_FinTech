'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, User, Account } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Existing components
import TransactionMonitor from '@/components/TransactionMonitor';
import FraudAlerts from '@/components/FraudAlerts';
import CustomerSegments from '@/components/CustomerSegments';
import DashboardHeader from '@/components/DashboardHeader';
import TransferRequestsPanel from '@/components/TransferRequestsPanel';
import FraudEventsPanel from '@/components/FraudEventsPanel';

// New AI-enhanced components
import RealtimeIntelligence from '@/components/RealtimeIntelligence';
import FraudHeatmap from '@/components/FraudHeatmap';
import BehaviourAnalytics from '@/components/BehaviourAnalytics';
import TransferTimeline from '@/components/TransferTimeline';
import DemoModePanel from '@/components/DemoModePanel';
import AICopilot from '@/components/AICopilot';
import ModelStatusBar from '@/components/ModelStatusBar';
import EnterpriseOpportunityPanel from '@/components/EnterpriseOpportunityPanel';
import { Brain, Activity, Shield, BarChart3, Play } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccounts: 0,
    totalTransactions: 0,
    fraudDetected: 0,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const cleanup = setupRealtimeListeners();
    return cleanup;
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const [users, accounts, txData] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('transactions').select('*').order('timestamp', { ascending: false }).limit(100),
      ]);

      const fraudCount = txData.data?.filter((t) => t.is_fraud).length || 0;

      setStats({
        totalUsers: users.data?.length || 0,
        totalAccounts: accounts.data?.length || 0,
        totalTransactions: txData.data?.length || 0,
        fraudDetected: fraudCount,
      });

      setUsers(users.data || []);
      setAccounts(accounts.data || []);
      setTransactions(txData.data || []);
      setFraudAlerts(txData.data?.filter((t) => t.fraud_score > 0.2) || []);
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function setupRealtimeListeners() {
    const channel = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          const newTx = payload.new as Transaction;
          setTransactions((prev) => [newTx, ...prev].slice(0, 100));
          if (newTx.fraud_score > 0.2) {
            setFraudAlerts((prev) => [newTx, ...prev]);
            setStats((prev) => ({ ...prev, fraudDetected: prev.fraudDetected + 1 }));
          }
          setStats((prev) => ({ ...prev, totalTransactions: prev.totalTransactions + 1 }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <DashboardHeader stats={stats} />

      {/* Model status bar */}
      <div className="border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <ModelStatusBar />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-700 h-9">
            <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              AI Intelligence
            </TabsTrigger>
            <TabsTrigger value="fraud" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Fraud Operations
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="demo" className="text-xs data-[state=active]:bg-violet-700 data-[state=active]:text-white text-slate-400 flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Demo Mode
              <Badge className="bg-violet-800 text-violet-200 text-[9px] py-0 px-1 ml-1">LIVE</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Fraud alerts */}
            <FraudAlerts alerts={fraudAlerts} isLoading={loading} />

            {/* Transaction monitor */}
            <TransactionMonitor transactions={transactions} isLoading={loading} />

            {/* Transfer + Fraud Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TransferRequestsPanel />
              <FraudEventsPanel />
            </div>

            {/* Customer segments */}
            <CustomerSegments />

            {/* Enterprise growth targeting */}
            <EnterpriseOpportunityPanel
              users={users}
              accounts={accounts}
              transactions={transactions}
              isLoading={loading}
            />
          </TabsContent>

          {/* ── AI Intelligence Tab ───────────────────────────────────────── */}
          <TabsContent value="intelligence" className="space-y-6 mt-0">
            {/* Realtime AI stream */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white">Realtime AI Intelligence</h2>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <RealtimeIntelligence initialTransactions={transactions} />
            </div>

            <Separator className="bg-slate-800" />

            {/* Fraud Heatmap */}
            <FraudHeatmap transactions={transactions} isLoading={loading} />

            <Separator className="bg-slate-800" />

            {/* Transfer Timeline */}
            <TransferTimeline transactions={transactions} isLoading={loading} />

            <EnterpriseOpportunityPanel
              users={users}
              accounts={accounts}
              transactions={transactions}
              isLoading={loading}
            />
          </TabsContent>

          {/* ── Fraud Operations Tab ──────────────────────────────────────── */}
          <TabsContent value="fraud" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FraudEventsPanel />
              <TransferRequestsPanel />
            </div>

            <FraudAlerts alerts={fraudAlerts} isLoading={loading} />

            <TransferTimeline transactions={fraudAlerts} isLoading={loading} maxItems={20} />
          </TabsContent>

          {/* ── Analytics Tab ─────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="space-y-6 mt-0">
            <BehaviourAnalytics transactions={transactions} isLoading={loading} />

            <Separator className="bg-slate-800" />

            <FraudHeatmap transactions={transactions} isLoading={loading} />

            <Separator className="bg-slate-800" />

            <CustomerSegments />
          </TabsContent>

          {/* ── Demo Mode Tab ─────────────────────────────────────────────── */}
          <TabsContent value="demo" className="mt-0">
            <DemoModePanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating AI Copilot */}
      <AICopilot />
    </div>
  );
}
