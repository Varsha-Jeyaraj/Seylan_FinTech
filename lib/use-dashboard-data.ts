'use client'

import { useEffect, useState } from 'react'
import { supabase, type Account, type Transaction, type User } from '@/lib/supabase'

export type DashboardStats = {
  totalUsers: number
  totalAccounts: number
  totalTransactions: number
  fraudDetected: number
}

const initialStats: DashboardStats = {
  totalUsers: 0,
  totalAccounts: 0,
  totalTransactions: 0,
  fraudDetected: 0,
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [fraudAlerts, setFraudAlerts] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    const cleanup = setupRealtimeListeners()
    return cleanup
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      const [usersResult, accountsResult, transactionsResult] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('transactions').select('*').order('timestamp', { ascending: false }).limit(100),
      ])

      const transactionsData = transactionsResult.data ?? []
      const fraudCount = transactionsData.filter((transaction) => transaction.is_fraud).length

      setStats({
        totalUsers: usersResult.data?.length ?? 0,
        totalAccounts: accountsResult.data?.length ?? 0,
        totalTransactions: transactionsData.length,
        fraudDetected: fraudCount,
      })

      setUsers(usersResult.data ?? [])
      setAccounts(accountsResult.data ?? [])
      setTransactions(transactionsData)
      setFraudAlerts(transactionsData.filter((transaction) => transaction.fraud_score > 0.2))
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function setupRealtimeListeners() {
    const channel = supabase
      .channel('dashboard-transactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        const newTransaction = payload.new as Transaction
        setTransactions((previousTransactions) => [newTransaction, ...previousTransactions].slice(0, 100))
        setStats((previousStats) => ({
          ...previousStats,
          totalTransactions: previousStats.totalTransactions + 1,
        }))

        if (newTransaction.fraud_score > 0.2) {
          setFraudAlerts((previousAlerts) => [newTransaction, ...previousAlerts])
          setStats((previousStats) => ({
            ...previousStats,
            fraudDetected: previousStats.fraudDetected + 1,
          }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  return {
    stats,
    transactions,
    users,
    accounts,
    fraudAlerts,
    loading,
  }
}
