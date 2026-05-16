'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FinancialProduct } from '@/lib/supabase'
import {
  UserPlus,
  CheckCircle2,
  Search,
  Brain,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

const MOCK_CUSTOMERS = [
  {
    id: 'cust_001',
    name: 'Amal Perera',
    nic: '198512345678',
    monthly_income: 1800000,
    credit_score: 820,
    monthly_spends: 300000,
    existing_loan_amount: 0,
    employment_status: 'Self-Employed',
  },
  {
    id: 'cust_002',
    name: 'Nimali Fernando',
    nic: '199512345679',
    monthly_income: 150000,
    credit_score: 710,
    monthly_spends: 80000,
    existing_loan_amount: 50000,
    employment_status: 'Employed',
  },
  {
    id: 'cust_003',
    name: 'Sunil Silva',
    nic: '199012345680',
    monthly_income: 60000,
    credit_score: 550,
    monthly_spends: 55000,
    existing_loan_amount: 800000,
    employment_status: 'Employed',
  },
]

export default function CRMPage() {
  useRouter()
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const [isNewWalkIn, setIsNewWalkIn] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    nic: '',
    monthly_income: '',
    credit_score: '',
    monthly_spends: '',
    existing_loan_amount: '',
    employment_status: 'Employed',
  })

  const handleSelectCustomer = async (customer: any) => {
    setIsNewWalkIn(false)
    setSelectedCustomer(customer)
    await runAnalysis(customer)
  }

  const runAnalysis = async (data: any) => {
    setLoading(true)
    setAnalysisResult(null)
    try {
      const res = await fetch('/api/customer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (res.ok) setAnalysisResult(result)
      else alert(result.error)
    } catch (e) {
      console.error(e)
      alert('Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const handleNewWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSelectedCustomer({ ...formData, id: 'walk_in_temp' })
    setIsNewWalkIn(false)
    await runAnalysis(formData)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="CRM & Customer Intelligence"
        description="Relationship manager portal for walk-in profiling and AI-powered cross-sell."
      />
      <div className="flex h-[calc(100vh-9.5rem)]">
        {/* Left Panel */}
        <aside className="flex w-full max-w-sm flex-col border-r border-border bg-card/40">
          <div className="space-y-3 border-b border-border p-4">
            <Button
              className="w-full gap-2 bg-primary text-primary-foreground hover:opacity-95"
              onClick={() => {
                setIsNewWalkIn(true)
                setSelectedCustomer(null)
                setAnalysisResult(null)
              }}
            >
              <UserPlus className="h-4 w-4" />
              New walk-in analysis
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers…"
                className="pl-9 text-sm"
              />
            </div>
          </div>
          <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-4">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Existing customers
            </h3>
            {MOCK_CUSTOMERS.map((c) => {
              const active = selectedCustomer?.id === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCustomer(c)}
                  className={`block w-full cursor-pointer rounded-md border p-3 text-left transition-colors ${
                    active
                      ? 'border-primary/50 bg-accent'
                      : 'border-border bg-background/50 hover:bg-accent/60'
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">
                    {c.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    NIC: {c.nic}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Right Panel */}
        <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
          {isNewWalkIn ? (
            <Card className="mx-auto max-w-2xl border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  Walk-in customer profiling
                </CardTitle>
                <CardDescription>
                  Enter customer details to run real-time AI cluster analysis.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleNewWalkInSubmit}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full name</Label>
                      <Input name="name" required onChange={handleFormChange} />
                    </div>
                    <div className="space-y-2">
                      <Label>NIC</Label>
                      <Input name="nic" required onChange={handleFormChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Monthly income (Rs.)</Label>
                      <Input
                        name="monthly_income"
                        type="number"
                        required
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly expenses (Rs.)</Label>
                      <Input
                        name="monthly_spends"
                        type="number"
                        required
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estimated credit score</Label>
                      <Input
                        name="credit_score"
                        type="number"
                        required
                        min="300"
                        max="850"
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Existing debt (Rs.)</Label>
                      <Input
                        name="existing_loan_amount"
                        type="number"
                        required
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Employment status</Label>
                    <Select
                      onValueChange={(val) =>
                        setFormData({ ...formData, employment_status: val })
                      }
                      defaultValue="Employed"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Employed">Employed</SelectItem>
                        <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                        <SelectItem value="Unemployed">Unemployed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:opacity-95"
                  >
                    Run AI analysis
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : selectedCustomer ? (
            <div className="mx-auto max-w-4xl space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {selectedCustomer.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    NIC: {selectedCustomer.nic} ·{' '}
                    {selectedCustomer.employment_status}
                  </p>
                </div>
                {loading && (
                  <span className="inline-flex animate-pulse items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/30">
                    Analysing…
                  </span>
                )}
              </div>

              {analysisResult && (
                <>
                  <Card className="relative overflow-hidden border-border bg-card">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Brain className="h-5 w-5 text-primary" />
                        AI intelligence profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Customer segment
                        </div>
                        <Badge className="mb-4 bg-primary text-primary-foreground hover:opacity-95">
                          {analysisResult.cluster.name}
                        </Badge>
                        <div className="rounded-md border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
                          {analysisResult.insights.explanation}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-border pb-2 text-sm">
                          <span className="text-muted-foreground">Income</span>
                          <span className="font-medium tabular-nums">
                            Rs.{' '}
                            {Number(
                              selectedCustomer.monthly_income
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2 text-sm">
                          <span className="text-muted-foreground">
                            Credit score
                          </span>
                          <span className="font-medium tabular-nums">
                            {selectedCustomer.credit_score}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2 text-sm">
                          <span className="text-muted-foreground">
                            Spend/Income ratio
                          </span>
                          <span className="font-medium tabular-nums">
                            {analysisResult.insights.spendToIncomeRatio}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <h3 className="mb-3 text-base font-semibold tracking-tight">
                      Cross-sell recommendations
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {analysisResult.recommendations.map(
                        (product: FinancialProduct) => (
                          <Card
                            key={product.id}
                            className="flex h-full flex-col border-border bg-card transition-colors hover:border-primary/40"
                          >
                            <CardHeader className="pb-3">
                              <Badge
                                variant="outline"
                                className="mb-2 w-fit border-primary/30 bg-primary/10 text-[10px] text-primary"
                              >
                                {product.type}
                              </Badge>
                              <CardTitle className="text-base">
                                {product.name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow pt-0 text-sm">
                              <p className="mb-4 line-clamp-2 text-muted-foreground">
                                {product.description}
                              </p>
                              <ul className="space-y-1.5">
                                {product.features.map((f, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-xs"
                                  >
                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                            <CardFooter className="border-t border-border pt-4">
                              <Button
                                variant="outline"
                                className="h-8 w-full text-xs"
                              >
                                Send offer via SMS
                              </Button>
                            </CardFooter>
                          </Card>
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <UserPlus className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm">
                Select a customer from the roster or start a new walk-in
                analysis.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
