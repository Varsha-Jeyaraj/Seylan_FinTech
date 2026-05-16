'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FinancialProduct } from '@/lib/supabase';
import { ArrowLeft, UserPlus, CheckCircle2, Search, ArrowRight, Brain, Briefcase } from 'lucide-react';

const MOCK_CUSTOMERS = [
  { id: 'cust_001', name: 'Amal Perera', nic: '198512345678', monthly_income: 1800000, credit_score: 820, monthly_spends: 300000, existing_loan_amount: 0, employment_status: 'Self-Employed' },
  { id: 'cust_002', name: 'Nimali Fernando', nic: '199512345679', monthly_income: 150000, credit_score: 710, monthly_spends: 80000, existing_loan_amount: 50000, employment_status: 'Employed' },
  { id: 'cust_003', name: 'Sunil Silva', nic: '199012345680', monthly_income: 60000, credit_score: 550, monthly_spends: 55000, existing_loan_amount: 800000, employment_status: 'Employed' },
];

export default function CRMPage() {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  
  // State for the "New Walk-in" form
  const [isNewWalkIn, setIsNewWalkIn] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nic: '',
    monthly_income: '',
    credit_score: '',
    monthly_spends: '',
    existing_loan_amount: '',
    employment_status: 'Employed'
  });

  const handleSelectCustomer = async (customer: any) => {
    setIsNewWalkIn(false);
    setSelectedCustomer(customer);
    await runAnalysis(customer);
  };

  const runAnalysis = async (data: any) => {
    setLoading(true);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/customer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) setAnalysisResult(result);
      else alert(result.error);
    } catch (e) {
      console.error(e);
      alert('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNewWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedCustomer({ ...formData, id: 'walk_in_temp' });
    setIsNewWalkIn(false);
    await runAnalysis(formData);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-2 h-auto" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-500" /> Seylan CRM & Customer Intelligence
            </h1>
            <p className="text-xs text-zinc-400">Relationship Manager Portal</p>
          </div>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Customer Roster */}
        <div className="w-1/3 max-w-sm border-r border-zinc-800 bg-zinc-950 flex flex-col">
          <div className="p-4 border-b border-zinc-800 space-y-4">
            <Button 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
              onClick={() => { setIsNewWalkIn(true); setSelectedCustomer(null); setAnalysisResult(null); }}
            >
              <UserPlus className="w-4 h-4" /> New Walk-In Analysis
            </Button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
              <Input placeholder="Search customers..." className="pl-9 bg-zinc-900 border-zinc-800 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Existing Customers</h3>
            {MOCK_CUSTOMERS.map((c) => (
              <div 
                key={c.id} 
                onClick={() => handleSelectCustomer(c)}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedCustomer?.id === c.id ? 'bg-zinc-800 border-orange-500/50' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'}`}
              >
                <div className="font-medium text-sm text-zinc-100">{c.name}</div>
                <div className="text-xs text-zinc-500 mt-1">NIC: {c.nic}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Analysis & Recommendations */}
        <div className="flex-1 bg-black p-6 overflow-y-auto">
          {isNewWalkIn ? (
            <Card className="max-w-2xl mx-auto bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-xl text-orange-500">Walk-In Customer Profiling</CardTitle>
                <CardDescription className="text-zinc-400">Enter customer details to run real-time AI cluster analysis.</CardDescription>
              </CardHeader>
              <form onSubmit={handleNewWalkInSubmit}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input name="name" required onChange={handleFormChange} className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>NIC</Label>
                      <Input name="nic" required onChange={handleFormChange} className="bg-zinc-800 border-zinc-700" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Monthly Income (Rs.)</Label>
                      <Input name="monthly_income" type="number" required onChange={handleFormChange} className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Expenses (Rs.)</Label>
                      <Input name="monthly_spends" type="number" required onChange={handleFormChange} className="bg-zinc-800 border-zinc-700" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estimated Credit Score</Label>
                      <Input name="credit_score" type="number" required min="300" max="850" onChange={handleFormChange} className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Existing Debt (Rs.)</Label>
                      <Input name="existing_loan_amount" type="number" required onChange={handleFormChange} className="bg-zinc-800 border-zinc-700" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Employment Status</Label>
                    <Select onValueChange={(val) => setFormData({...formData, employment_status: val})} defaultValue="Employed">
                      <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-800 text-white">
                        <SelectItem value="Employed">Employed</SelectItem>
                        <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                        <SelectItem value="Unemployed">Unemployed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700 w-full">Run AI Analysis</Button>
                </CardFooter>
              </form>
            </Card>
          ) : selectedCustomer ? (
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                  <p className="text-zinc-400">NIC: {selectedCustomer.nic} • {selectedCustomer.employment_status}</p>
                </div>
                {loading && <Badge variant="outline" className="animate-pulse border-orange-500 text-orange-500">Analyzing...</Badge>}
              </div>

              {analysisResult && (
                <>
                  <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-orange-500/30 overflow-hidden relative">
                    <div className="absolute right-0 top-0 p-24 bg-orange-500/5 rounded-full blur-3xl -mr-12 -mt-12"></div>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="w-5 h-5 text-orange-500" /> AI Intelligence Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                      <div>
                        <div className="text-sm text-zinc-400 uppercase tracking-wide mb-1">Customer Segment</div>
                        <Badge className="bg-orange-600 hover:bg-orange-700 text-base py-1 px-3 mb-4">{analysisResult.cluster.name}</Badge>
                        <div className="bg-black/50 p-4 rounded-md border border-zinc-800 text-sm text-zinc-300 leading-relaxed">
                          {analysisResult.insights.explanation}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between border-b border-zinc-800 pb-2">
                          <span className="text-zinc-400 text-sm">Income</span>
                          <span className="font-medium text-sm">Rs. {Number(selectedCustomer.monthly_income).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-800 pb-2">
                          <span className="text-zinc-400 text-sm">Credit Score</span>
                          <span className="font-medium text-sm">{selectedCustomer.credit_score}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-800 pb-2">
                          <span className="text-zinc-400 text-sm">Spend/Income Ratio</span>
                          <span className="font-medium text-sm">{analysisResult.insights.spendToIncomeRatio}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <h3 className="text-lg font-bold mb-4 mt-8 flex items-center gap-2 text-zinc-200">
                      Cross-Sell Recommendations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysisResult.recommendations.map((product: FinancialProduct) => (
                        <Card key={product.id} className="bg-zinc-900 border-zinc-800 flex flex-col h-full hover:border-orange-500/50 transition-colors">
                          <CardHeader className="pb-3">
                            <Badge variant="outline" className="w-fit text-[10px] text-orange-400 border-orange-900 bg-orange-950 mb-2">
                              {product.type}
                            </Badge>
                            <CardTitle className="text-base text-zinc-100">{product.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="flex-grow pt-0 text-sm">
                            <p className="text-zinc-400 mb-4 line-clamp-2">{product.description}</p>
                            <ul className="space-y-1.5">
                              {product.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                          <CardFooter className="pt-4 border-t border-zinc-800">
                            <Button variant="outline" className="w-full text-xs h-8 border-zinc-700 hover:bg-zinc-800">
                              Send Offer via SMS
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
              <UserPlus className="w-12 h-12 text-zinc-800" />
              <p>Select a customer from the roster or start a new walk-in analysis.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
