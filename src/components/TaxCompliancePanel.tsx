import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

type AdminPanelProps = { adminToken: string };

export function TaxCompliancePanel({ adminToken }: AdminPanelProps) {
  const [section, setSection] = useState<"overview" | "expenses" | "calculator" | "schedule" | "return">("overview");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [income, setIncome] = useState("");
  const [turnover, setTurnover] = useState("");
  const [calcResult, setCalcResult] = useState<any>(null);

  const showToast = (type: "success" | "error", msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

  const { data: dashboard } = useSuspenseQuery(convexQuery(api.tax.getTaxComplianceDashboard, { adminToken }));
  const { data: categories } = useSuspenseQuery(convexQuery(api.tax.getExpenseCategories, {}));
  const { data: expenses } = useSuspenseQuery(convexQuery(api.tax.listBusinessExpenses, {}));
  const { data: expenseSummary } = useSuspenseQuery(convexQuery(api.tax.getExpenseSummary, {}));
  const { data: schedule } = useSuspenseQuery(convexQuery(api.tax.getTaxPaymentSchedule, {}));
  const { data: calculations } = useSuspenseQuery(convexQuery(api.tax.getTaxCalculations, {}));

  const addExpense = useMutation(api.tax.addBusinessExpense);
  const verifyExpense = useMutation(api.tax.verifyExpense);
  const calculateTax = useAction(api.tax.calculateFullTax2025);
  const generateReturn = useAction(api.tax.generateAnnualTaxReturn);
  const markPaid = useMutation(api.tax.markPaymentPaid);

  const dash = dashboard ?? {};
  const latestCalc = dash.latestCalculation ?? calcResult;

  const handleCalculate = async () => {
    const inc = parseFloat(income) || 0;
    const rev = parseFloat(turnover) || 0;
    if (inc === 0) { showToast("error", "Enter annual income"); return; }
    try {
      const result = await calculateTax({ adminToken, annualIncome: inc, annualTurnover: rev });
      if (result?.authError) { showToast("error", "Auth failed"); return; }
      setCalcResult(result);
      showToast("success", "Tax calculated successfully");
    } catch (e: any) { showToast("error", e?.message ?? "Calculation failed"); }
  };

  const handleGenerateReturn = async () => {
    try {
      const result = await generateReturn({ adminToken, taxYear: new Date().getFullYear() });
      if (result?.authError) { showToast("error", "Auth failed"); return; }
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `tax-return-${result.taxYear}.json`; a.click();
      showToast("success", "Tax return generated");
    } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
  };

  const [newExpense, setNewExpense] = useState({ category: "Rent", description: "", amount: "" });
  const handleAddExpense = async () => {
    const amt = parseFloat(newExpense.amount) || 0;
    if (!newExpense.description || amt === 0) { showToast("error", "Fill all fields"); return; }
    try {
      const res = await addExpense({ category: newExpense.category, description: newExpense.description, amountNgn: amt, expenseDate: Date.now() });
      if (res?.success) { showToast("success", "Expense added"); setNewExpense({ category: "Rent", description: "", amount: "" }); }
    } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-6">
      {toast && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600/20 to-slate-900 border border-amber-500/20 rounded-[3rem] p-10">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Nigerian Tax Compliance</h2>
        <p className="text-xs font-black text-amber-500 uppercase tracking-widest mt-1">Nigeria Tax Act 2025 — FIRS Compliant</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(["overview", "expenses", "calculator", "schedule", "return"] as const).map((s) => (
            <button key={s} onClick={() => setSection(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${section === s ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {section === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Tax-Free Threshold" value="₦800K" icon="🛡️" color="emerald" subValue="Act 2025" />
          <MetricCard label="Total Expenses" value={`₦${((expenseSummary?.totalSpent ?? 0) / 1000).toFixed(0)}K`} icon="📋" color="blue" subValue={`${expenseSummary?.verifiedCount ?? 0} verified`} />
          <MetricCard label="Deductible" value={`₦${((expenseSummary?.totalDeductible ?? 0) / 1000).toFixed(0)}K`} icon="✅" color="emerald" subValue="Approved" />
          <MetricCard label="Tax Liability" value={`₦${((latestCalc?.taxOwed ?? 0) / 1000).toFixed(0)}K`} icon="💰" color="amber" subValue={latestCalc?.effectiveRate ? `${latestCalc.effectiveRate}% effective` : "Calculate"} />
          <MetricCard label="CIT Status" value={latestCalc?.isSmallBusiness ? "EXEMPT" : "30%"} icon="🏢" color={latestCalc?.isSmallBusiness ? "emerald" : "amber"} subValue={latestCalc?.exemptionApplied ? "Turnover < ₦100M" : ""} />
          <MetricCard label="Payments" value={dash.payments?.paid ?? 0} icon="📅" color="blue" subValue={`${dash.payments?.overdue ?? 0} overdue`} />
          <MetricCard label="Marginal Rate" value={latestCalc?.breakdown?.length ? latestCalc.breakdown[latestCalc.breakdown.length - 1].rate : "0%"} icon="📊" color="indigo" subValue="Highest bracket" />
          <MetricCard label="Development Levy" value="₦100K" icon="🏛️" color="slate" subValue="Annual" />
        </div>
      )}

      {/* Expenses */}
      {section === "expenses" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white uppercase mb-4">Add Business Expense</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm">
                {(categories ?? []).map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Description" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
              <input value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="Amount (₦)" type="number" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
              <button onClick={handleAddExpense} className="bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-sm">Add</button>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-slate-800"><h3 className="text-lg font-black text-white uppercase">Expenses ({expenses?.length ?? 0})</h3></div>
            <div className="divide-y divide-slate-800">
              {(expenses ?? []).map((e: any) => (
                <div key={e._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
                  <div>
                    <p className="text-sm font-bold text-white">{e.category} — {e.description}</p>
                    <p className="text-[10px] text-slate-500">₦{e.amountNgn.toLocaleString()} • Deductible: ₦{e.deductibleAmount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${e.status === "verified" ? "bg-emerald-500/10 text-emerald-500" : e.status === "rejected" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>{e.status}</span>
                    {e.status === "pending" && (
                      <>
                        <button onClick={() => verifyExpense({ adminToken, expenseId: e._id, approved: true })} className="px-2 py-1 bg-emerald-500/20 text-emerald-500 rounded text-[8px] font-black">✓</button>
                        <button onClick={() => verifyExpense({ adminToken, expenseId: e._id, approved: false })} className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-[8px] font-black">✗</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calculator */}
      {section === "calculator" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white uppercase mb-4">Tax Calculator (2025 Act)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <input value={income} onChange={(e) => setIncome(e.target.value)} placeholder="Annual Income (₦)" type="number" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
              <input value={turnover} onChange={(e) => setTurnover(e.target.value)} placeholder="Annual Turnover (₦)" type="number" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
              <button onClick={handleCalculate} className="bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-sm">Calculate Tax</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Bracket</span><span>Rate</span><span>Tax</span>
            </div>
            {latestCalc?.breakdown?.map((b: any, i: number) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-3 py-2 border-t border-slate-800 text-sm">
                <span className="text-white">{b.range}</span>
                <span className="text-amber-500">{b.rate}</span>
                <span className="text-emerald-500">₦{b.tax.toLocaleString()}</span>
              </div>
            ))}
            {latestCalc && (
              <div className="mt-6 p-4 bg-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between"><span className="text-slate-400 text-sm">Tax-Free Threshold</span><span className="text-white font-bold">₦800,000</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-sm">Taxable Income</span><span className="text-white font-bold">₦{(latestCalc.taxableIncome ?? 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-sm">Income Tax</span><span className="text-amber-500 font-bold">₦{(latestCalc.taxOwed ?? 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-sm">CIT</span><span className="text-amber-500 font-bold">₦{(latestCalc.citOwed ?? 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-sm">Development Levy</span><span className="text-amber-500 font-bold">₦100,000</span></div>
                <div className="flex justify-between border-t border-slate-700 pt-2"><span className="text-white font-black">Total Tax Liability</span><span className="text-emerald-500 font-black">₦{(latestCalc.totalTaxLiability ?? 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-sm">Effective Rate</span><span className="text-white font-bold">{latestCalc.effectiveRate}%</span></div>
                {latestCalc.isSmallBusiness && <div className="mt-2 p-3 bg-emerald-500/10 rounded-xl"><p className="text-xs font-black text-emerald-500">✅ Small Business CIT Exemption Applied — Turnover under ₦100M</p></div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule */}
      {section === "schedule" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-800"><h3 className="text-lg font-black text-white uppercase">Tax Payment Schedule</h3></div>
          <div className="divide-y divide-slate-800">
            {(schedule ?? []).map((p: any) => (
              <div key={p._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
                <div>
                  <p className="text-sm font-bold text-white">{p.quarter} — Due: {p.dueDate}</p>
                  <p className="text-[10px] text-slate-500">Estimated: ₦{p.estimatedAmount.toLocaleString()} • Paid: ₦{p.paidAmount.toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${p.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : p.status === "overdue" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual Return */}
      {section === "return" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white uppercase mb-4">Annual Tax Return (FIRS Filing)</h3>
            <p className="text-sm text-slate-400 mb-6">Generate your annual tax return for FIRS filing. Includes all income, expenses, deductions, and tax calculations.</p>
            <button onClick={handleGenerateReturn} className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl">
              Generate Tax Return {new Date().getFullYear()}
            </button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h4 className="text-sm font-black text-white uppercase mb-3">Filing Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">TIN:</span> <span className="text-white font-bold">2512403526652</span></div>
              <div><span className="text-slate-500">RC Number:</span> <span className="text-white font-bold">9489855</span></div>
              <div><span className="text-slate-500">Business Name:</span> <span className="text-white font-bold">Dutchkem Ventures</span></div>
              <div><span className="text-slate-500">Entity Type:</span> <span className="text-white font-bold">Sole Proprietorship</span></div>
              <div><span className="text-slate-500">Tax-Free Threshold:</span> <span className="text-emerald-500 font-bold">₦800,000</span></div>
              <div><span className="text-slate-500">Filing Year:</span> <span className="text-white font-bold">{new Date().getFullYear()}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, color, subValue }: any) {
  const colors: Record<string, string> = { emerald: "bg-emerald-500/10 text-emerald-500", amber: "bg-amber-500/10 text-amber-500", blue: "bg-blue-500/10 text-blue-500", red: "bg-red-500/10 text-red-500", indigo: "bg-indigo-500/10 text-indigo-500", slate: "bg-slate-500/10 text-slate-500" };
  return (
    <div className={`p-5 rounded-3xl border border-white/5 ${colors[color] ?? colors.slate}`}>
      <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span><span className="text-lg">{icon}</span></div>
      <p className="text-2xl font-black">{value}</p>
      {subValue && <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">{subValue}</p>}
    </div>
  );
}
