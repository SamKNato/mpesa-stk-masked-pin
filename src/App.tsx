import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldAlert, Code2, ArrowRight,
  Github, ExternalLink, AlertTriangle, Users, Zap,
} from 'lucide-react';
import STKPopup, { type ConfirmationMode } from './components/STKPopup';

// ─── Mode metadata ────────────────────────────────────────────────────────────

const MODES: {
  value:       ConfirmationMode;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  status:      'danger' | 'safe' | 'advanced';
}[] = [
  {
    value:       'standard',
    label:       'Current',
    description: 'PIN digits are visible as typed — the status quo today at every checkout in Kenya',
    icon:        <ShieldAlert className="w-4 h-4" />,
    status:      'danger',
  },
  {
    value:       'masked',
    label:       'Proposed: Masked',
    description: 'Each digit immediately replaced with ● — the fix. One parameter, zero merchant effort.',
    icon:        <ShieldCheck className="w-4 h-4" />,
    status:      'safe',
  },
  {
    value:       'biometric',
    label:       'Proposed: Biometric',
    description: 'Fingerprint / face-ID authentication — no PIN typing at all. The future.',
    icon:        <Zap className="w-4 h-4" />,
    status:      'advanced',
  },
];

// ─── API diff code strings ────────────────────────────────────────────────────

const CODE_CURRENT = `POST /mpesa/stkpush/v1/processrequest

{
  "BusinessShortCode": "174379",
  "Password": "...",
  "Timestamp": "20260511120000",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": 4847,
  "PartyA": "254712345678",
  "PartyB": "174379",
  "PhoneNumber": "254712345678",
  "CallBackURL": "https://merchant.ke/callback",
  "AccountReference": "Order-4821",
  "TransactionDesc": "Payment"
}`;

const CODE_PROPOSED = `POST /mpesa/stkpush/v1/processrequest

{
  "BusinessShortCode": "174379",
  "Password": "...",
  "Timestamp": "20260511120000",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": 4847,
  "PartyA": "254712345678",
  "PartyB": "174379",
  "PhoneNumber": "254712345678",
  "CallBackURL": "https://merchant.ke/callback",
  "AccountReference": "Order-4821",
  "TransactionDesc": "Payment",
  "ConfirmationMode": "masked",
  "BiometricFallback": true
}`;

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <p className="text-2xl font-extrabold gradient-text">{value}</p>
      <p className="text-slate-700 font-semibold text-sm mt-0.5">{label}</p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeMode, setActiveMode] = useState<ConfirmationMode>('standard');
  const [codeTab,    setCodeTab]    = useState<'current' | 'proposed'>('current');

  const currentMeta = MODES.find((m) => m.value === activeMode)!;

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Top Banner ──────────────────────────────────────────────────────── */}
      <div className="bg-mpesa-green text-white text-center py-2.5 px-4 text-sm font-medium">
        🔒 Community proposal — star{' '}
        <a
          href="https://github.com/SamKNato/mpesa-stk-masked-pin"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-bold hover:no-underline"
        >
          the repo
        </a>{' '}
        to signal demand to Safaricom
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-mpesa-green rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">M</span>
            </div>
            <span className="font-bold text-slate-800 text-sm hidden sm:block">
              STK Push Masked PIN Proposal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/SamKNato/mpesa-stk-masked-pin/blob/main/docs/SAFARICOM-INTEGRATION-GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors hidden sm:block"
            >
              Integration Guide
            </a>
            <a
              href="https://github.com/SamKNato/mpesa-stk-masked-pin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-sm font-semibold
                         px-3.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-20">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 bg-red-50 border border-red-200
                             text-red-600 font-semibold text-xs px-3 py-1.5 rounded-full mb-4">
              <AlertTriangle className="w-3.5 h-3.5" />
              Active security gap — affecting 51M+ users daily
            </span>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
              M-Pesa PINs are typed
              <br />
              <span className="gradient-text">in plain sight. Every day.</span>
            </h1>

            <p className="text-slate-500 text-base sm:text-lg mt-4 leading-relaxed max-w-2xl mx-auto">
              Every checkout queue in Kenya is a shoulder-surfing opportunity.
              One new API parameter —{' '}
              <code className="bg-slate-100 text-mpesa-green-dark px-1.5 py-0.5 rounded font-mono text-sm font-bold">
                ConfirmationMode: "masked"
              </code>{' '}
              — fixes it permanently, for every customer, with zero merchant effort.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-wrap gap-3 justify-center"
          >
            <a
              href="#demo"
              className="inline-flex items-center gap-2 bg-mpesa-green text-white font-semibold
                         px-5 py-2.5 rounded-xl hover:bg-mpesa-green-dark transition-colors shadow-sm"
            >
              See the demo <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/SamKNato/mpesa-stk-masked-pin/blob/main/docs/SAFARICOM-INTEGRATION-GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700
                         font-semibold px-5 py-2.5 rounded-xl hover:border-slate-300 transition-colors"
            >
              Integration Guide <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard value="51M+"  label="M-Pesa active users"   sub="Safaricom Annual Report 2025" />
          <StatCard value="~15M"  label="STK Push txns / day"   sub="Estimated across all merchants" />
          <StatCard value="1"     label="New API parameter"      sub="All that is needed to fix this" />
          <StatCard value="0"     label="Merchant code changes"  sub="Once Safaricom ships support" />
        </section>

        {/* ── Interactive Demo ──────────────────────────────────────────────── */}
        <section id="demo" className="scroll-mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Interactive Demo
            </h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              Toggle between modes to experience the security difference first-hand.
              Click inside the phone to type a PIN.
            </p>
          </div>

          {/* Mode selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-slate-100 rounded-2xl p-1.5 gap-1 flex-wrap justify-center">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setActiveMode(m.value)}
                  className={[
                    'mode-tab',
                    activeMode === m.value ? 'active' : 'inactive',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-1.5">
                    {m.icon}
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode description */}
          <AnimatePresence mode="wait">
            <motion.p
              key={activeMode}
              initial={{ opacity: 0, y: 6  }}
              animate={{ opacity: 1, y: 0  }}
              exit={{   opacity: 0, y: -6  }}
              className="text-center text-slate-500 text-sm mb-10 max-w-lg mx-auto"
            >
              {currentMeta.description}
            </motion.p>
          </AnimatePresence>

          {/* Phone demo — desktop: side-by-side comparison, mobile: single */}
          <div className="flex flex-col sm:flex-row gap-10 justify-center items-center sm:items-start">

            {/* Current mode always shown on left for comparison */}
            {activeMode !== 'standard' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0   }}
                className="hidden sm:flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-2 text-red-500 font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  Current (unmasked)
                </div>
                <STKPopup
                  mode="standard"
                  merchant="Carrefour Supermarket"
                  amount={4847}
                  phone="0712 345 678"
                  accountRef="Order #4821"
                />
              </motion.div>
            )}

            {/* Arrow between phones on desktop */}
            {activeMode !== 'standard' && (
              <div className="hidden sm:flex items-center self-center text-slate-300">
                <ArrowRight className="w-8 h-8" />
              </div>
            )}

            {/* Active mode phone */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMode}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1    }}
                exit={{   opacity: 0, scale: 0.95  }}
                transition={{ type: 'spring', stiffness: 320, damping: 25 }}
                className="flex flex-col items-center gap-4"
              >
                <div className={`flex items-center gap-2 font-semibold text-sm ${
                  activeMode === 'standard' ? 'text-red-500' : 'text-mpesa-green'
                }`}>
                  {currentMeta.icon}
                  {currentMeta.label}
                </div>
                <STKPopup
                  mode={activeMode}
                  merchant="Carrefour Supermarket"
                  amount={4847}
                  phone="0712 345 678"
                  accountRef="Order #4821"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ── API Comparison ────────────────────────────────────────────────── */}
        <section>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-mpesa-green font-semibold text-sm mb-3">
              <Code2 className="w-4 h-4" />
              The API Change
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Two lines. That's the entire fix.
            </h2>
            <p className="text-slate-500 mt-2 text-sm max-w-xl mx-auto">
              The new parameters are fully backward-compatible. Merchants who don't send them
              get current behaviour. Merchants who do, get immediate security for their customers.
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm max-w-3xl mx-auto">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {(['current', 'proposed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCodeTab(tab)}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                    codeTab === tab
                      ? 'bg-white text-slate-800 border-b-2 border-mpesa-green'
                      : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab === 'current' ? '❌  Current Payload' : '✅  Proposed Payload'}
                </button>
              ))}
            </div>

            {/* Code */}
            <AnimatePresence mode="wait">
              <motion.pre
                key={codeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{   opacity: 0 }}
                className="code-block m-0 rounded-none text-[12px] sm:text-xs leading-relaxed"
              >
                <code>
                  {codeTab === 'current' ? CODE_CURRENT : CODE_PROPOSED}
                  {codeTab === 'proposed' && (
                    <span className="block mt-3 text-mpesa-green font-semibold text-[11px]">
                      {`// ↑ These two lines are the entire proposal.\n// Currently silently ignored by Safaricom's API.\n// Once they ship support, every merchant sending this field\n// gets immediate masked-PIN UI on their customers' devices.`}
                    </span>
                  )}
                </code>
              </motion.pre>
            </AnimatePresence>
          </div>
        </section>

        {/* ── Security Analysis Table ───────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Risk Reduction
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              What changes — and what doesn't — with masked mode enabled.
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-slate-600 font-semibold">Attack Vector</th>
                  <th className="text-center px-4 py-3 text-red-500 font-semibold">Current</th>
                  <th className="text-center px-4 py-3 text-mpesa-green font-semibold">Masked Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { vector: 'Shoulder surfing (cashier / queue)',   before: 'HIGH',     after: 'ELIMINATED' },
                  { vector: 'Overhead CCTV cameras',                before: 'HIGH',     after: 'ELIMINATED' },
                  { vector: 'Phone camera eavesdropping',           before: 'MEDIUM',   after: 'ELIMINATED' },
                  { vector: 'Coordinated social engineering',        before: 'MEDIUM',   after: 'ELIMINATED' },
                  { vector: 'PIN reuse across other services',       before: 'CRITICAL', after: 'MEDIUM (unchanged)' },
                ].map((row) => (
                  <tr key={row.vector} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-700">{row.vector}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-block bg-red-50 text-red-600 border border-red-100
                                       rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        {row.before}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold
                        ${row.after === 'ELIMINATED'
                          ? 'bg-mpesa-green-pale text-mpesa-green-dark border border-green-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                        {row.after}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Call to Action ────────────────────────────────────────────────── */}
        <section className="bg-mpesa-green rounded-3xl p-10 text-center text-white">
          <Users className="w-10 h-10 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Every day we wait, millions of PINs are typed in plain sight.
          </h2>
          <p className="text-white/80 text-sm sm:text-base mb-7 max-w-xl mx-auto">
            Star the repository to signal demand. Share with Safaricom developer contacts.
            This proposal is ready — the implementation guide is written and waiting.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="https://github.com/SamKNato/mpesa-stk-masked-pin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-mpesa-green font-bold
                         px-6 py-3 rounded-xl hover:bg-white/90 transition-colors shadow-sm"
            >
              <Github className="w-5 h-5" />
              Star on GitHub
            </a>
            <a
              href="https://github.com/SamKNato/mpesa-stk-masked-pin/blob/main/docs/SAFARICOM-INTEGRATION-GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold
                         px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Read the Guide <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-8 text-center text-slate-400 text-sm">
        <p>
          Apache 2.0 · Built by{' '}
          <a
            href="https://github.com/SamKNato"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mpesa-green hover:underline font-semibold"
          >
            SamKNato
          </a>
          {' '}and the Kenyan developer community ·{' '}
          <a
            href="https://github.com/SamKNato/mpesa-stk-masked-pin"
            className="text-mpesa-green hover:underline font-medium"
          >
            Contribute on GitHub
          </a>
        </p>
        <p className="mt-1 text-xs">
          Not affiliated with Safaricom PLC. This is an independent open-source proposal.
        </p>
      </footer>
    </div>
  );
}
