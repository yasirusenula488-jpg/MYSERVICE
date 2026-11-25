import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Info, ShieldCheck, X, XCircle } from 'lucide-react';

interface CheckoutSession {
  orderId: string;
  transactionRef: string;
  amountLkr: number;
  currency: string;
  itemTitle: string;
  gatewayMode: 'payhere_sandbox_demo' | 'payhere_live';
  expiresAt: number;
  signatureToken: string;
}

interface PayHereDemoModalProps {
  open: boolean;
  uid: string;
  paymentType: 'booking' | 'subscription' | 'featured_listing';
  referenceId: string;
  amountLkr: number;
  itemTitle: string;
  onClose: () => void;
  onVerified: (result: {
    transactionRef: string;
    gatewayMode: 'payhere_sandbox_demo' | 'payhere_live';
  }) => Promise<void>;
}

export const PayHereDemoModal: React.FC<PayHereDemoModalProps> = ({
  open,
  uid,
  paymentType,
  referenceId,
  amountLkr,
  itemTitle,
  onClose,
  onVerified,
}) => {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declinedMsg, setDeclinedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !uid) return;
    let active = true;
    setLoading(true);
    setError(null);
    setDeclinedMsg(null);
    setSession(null);

    fetch('/api/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, paymentType, referenceId, amountLkr, itemTitle }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');
        if (active) setSession(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Checkout error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, uid, paymentType, referenceId, amountLkr, itemTitle]);

  if (!open) return null;

  const handleSimulate = async (outcome: 'success' | 'failed') => {
    if (!session) return;
    setVerifying(true);
    setError(null);
    setDeclinedMsg(null);
    try {
      const res = await fetch('/api/payments/verify-sandbox-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          orderId: session.orderId,
          transactionRef: session.transactionRef,
          paymentType,
          referenceId,
          amountLkr: session.amountLkr,
          expiresAt: session.expiresAt,
          signatureToken: session.signatureToken,
          outcome,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }
      if (!data.verified) {
        setDeclinedMsg(data.message || 'Sandbox payment declined.');
        return;
      }
      await onVerified({
        transactionRef: data.transactionRef,
        gatewayMode: data.gatewayMode,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payhere-demo-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="payhere-demo-title" className="text-lg font-bold text-[#142B4A]">
                PayHere Sandbox Demo Checkout
              </h2>
              <p className="text-xs text-slate-500">
                Development / Sandbox Mode · Server-verified signature
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 p-3.5 rounded-xl bg-[#F5F8FD] border border-blue-100 flex items-start gap-3 text-xs text-slate-700">
          <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[#142B4A] mb-0.5">
              Live PayHere Merchant Keys Not Configured
            </p>
            <p>
              No real money is charged and no card details are collected or stored. Checkout tokens
              are signed and verified by the MYSERVICE server. Add{' '}
              <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200">
                PAYHERE_MERCHANT_ID
              </code>{' '}
              and{' '}
              <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200">
                PAYHERE_MERCHANT_SECRET
              </code>{' '}
              to enable live Sri Lankan card & wallet payments.
            </p>
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500 py-6 text-center">Creating server checkout session...</p>}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 mb-4">
            {error}
          </div>
        )}

        {declinedMsg && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{declinedMsg}</span>
          </div>
        )}

        {session && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Item</span>
                <span className="font-medium text-[#142B4A] text-right">{session.itemTitle}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono text-xs text-slate-700">{session.orderId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Sandbox Ref</span>
                <span className="font-mono text-xs text-slate-700">{session.transactionRef}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                <span className="font-semibold text-[#142B4A]">Total Payable (Demo)</span>
                <span className="font-mono text-lg font-bold text-[#2563EB] tabular-nums">
                  LKR {session.amountLkr.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>HMAC signature verified server-side before recording payment status.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleSimulate('failed')}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                Simulate Declined
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleSimulate('success')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                {verifying ? 'Verifying...' : 'Confirm Sandbox Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
