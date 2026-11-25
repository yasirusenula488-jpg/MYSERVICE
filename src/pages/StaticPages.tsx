import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { usePageMeta } from '../components/PageMeta';
import { useLanguage } from '../context/LanguageContext';
import { FAQ_ITEMS } from '../data/sampleCatalog';
import { submitContactMessage } from '../lib/marketplaceService';

export const HowItWorksPage: React.FC = () => {
  usePageMeta('How It Works', 'Learn how MYSERVICE connects customers and service providers across Sri Lanka.');
  return (
    <div className="bg-[#F5F8FD] min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10">
          <h1 className="font-display text-3xl font-extrabold text-[#142B4A] mb-3">
            How MYSERVICE Works
          </h1>
          <p className="text-slate-600 text-base leading-relaxed">
            Whether you need an electrician in Colombo, a tutor in Kandy, or want to offer your own services across Sri Lanka, MYSERVICE keeps everything in one account.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-[#2563EB]">For Customers</h2>
            <p className="text-sm text-slate-600">01. Search verified listings across all 15 categories and 25 districts, or post a custom job request.</p>
            <p className="text-sm text-slate-600">02. Receive and compare quotations with LKR pricing and completion estimates.</p>
            <p className="text-sm text-slate-600">03. Chat privately, accept the right quotation, and share your exact address only with your booked provider.</p>
            <p className="text-sm text-slate-600">04. Mark jobs completed and publish verified booking reviews.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-[#142B4A]">For Service Providers</h2>
            <p className="text-sm text-slate-600">01. Register once with Google and complete the Provider Onboarding form on the same account.</p>
            <p className="text-sm text-slate-600">02. Switch into Provider Mode anytime to publish service packages and quote on matching local jobs.</p>
            <p className="text-sm text-slate-600">03. Submit private NIC/BR & trade certificates for Admin Verification to earn the Verified badge.</p>
            <p className="text-sm text-slate-600">04. Switch back to Customer Mode whenever you need to hire another specialist.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AboutPage: React.FC = () => {
  usePageMeta('About MYSERVICE', 'About Sri Lanka’s trilingual national services marketplace.');
  return (
    <div className="bg-[#F5F8FD] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 space-y-5">
        <h1 className="font-display text-3xl font-extrabold text-[#142B4A]">About MYSERVICE</h1>
        <p className="text-slate-600 leading-relaxed">
          MYSERVICE was built to solve a real Sri Lankan challenge: finding trustworthy local services without relying on fragmented social media posts or unverified word-of-mouth.
        </p>
        <p className="text-slate-600 leading-relaxed">
          Launching with focused coverage in the Western Province (Colombo, Gampaha, and Kalutara) and structured support across all 9 provinces and 25 districts, MYSERVICE operates in English, Sinhala (සිංහල), and Tamil (தமிழ்) so every citizen and business can participate seamlessly.
        </p>
        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
          <Link to="/services" className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
            Find Services
          </Link>
          <Link to="/become-provider" className="px-5 py-2.5 rounded-xl border border-slate-200 text-[#142B4A] text-sm font-semibold">
            Become a Provider
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  usePageMeta('Contact Us', 'Contact the MYSERVICE Sri Lanka support team.');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (message.trim().length < 10) {
      setError('Message must be at least 10 characters.');
      return;
    }
    setBusy(true);
    try {
      await submitContactMessage({ name, email, subject, message });
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#F5F8FD] min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-8 space-y-5">
          <h1 className="font-display text-3xl font-extrabold text-[#142B4A]">Contact Us</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Questions about provider verification, bookings, or business partnerships across Sri Lanka? Reach our team directly.
          </p>
          <div className="space-y-3 text-sm text-[#142B4A]">
            <p className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#2563EB]" /> Colombo, Western Province, Sri Lanka
            </p>
            <p className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#2563EB]" /> support@myservice.lk
            </p>
            <p className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#2563EB]" /> +94 11 000 0000
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-8 space-y-4">
          {sent && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Your message was saved and delivered to the MYSERVICE admin inbox.</span>
            </div>
          )}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B4A] mb-1">Subject *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B4A] mb-1">Message *</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-6 py-3 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const FaqPage: React.FC = () => {
  const { lang } = useLanguage();
  usePageMeta('Help Center & FAQ', 'Frequently asked questions about MYSERVICE Sri Lanka.');
  return (
    <div className="bg-[#F5F8FD] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
        <h1 className="font-display text-3xl font-extrabold text-[#142B4A] mb-4">Help Center & FAQ</h1>
        {FAQ_ITEMS.map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-bold text-[#142B4A] mb-2">
              {lang === 'si' ? item.q_si : lang === 'ta' ? item.q_ta : item.q_en}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'si' ? item.a_si : lang === 'ta' ? item.a_ta : item.a_en}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PolicyPage: React.FC<{
  type: 'terms' | 'privacy' | 'provider-guidelines' | 'customer-guidelines';
}> = ({ type }) => {
  const titles = {
    terms: 'Terms and Conditions',
    privacy: 'Privacy Policy',
    'provider-guidelines': 'Provider Guidelines',
    'customer-guidelines': 'Customer Guidelines',
  };
  usePageMeta(titles[type], `${titles[type]} for MYSERVICE Sri Lanka.`);

  return (
    <div className="bg-[#F5F8FD] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 space-y-5">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#2563EB]">
          <ShieldCheck className="w-4 h-4" /> MYSERVICE Trust & Safety
        </div>
        <h1 className="font-display text-3xl font-extrabold text-[#142B4A]">{titles[type]}</h1>

        {type === 'terms' && (
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>1. MYSERVICE operates as an online marketplace connecting customers and independent service providers across Sri Lanka.</p>
            <p>2. Users maintain a single verified account capable of accessing Customer Mode and, upon registration, Provider Mode.</p>
            <p>3. Quotations, schedules, and service deliverables agreed between customers and providers are tracked as formal marketplace bookings.</p>
            <p>4. Administrators reserve the right to suspend accounts, revoke verification badges, or mediate disputes under documented audit trails.</p>
          </div>
        )}

        {type === 'privacy' && (
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>1. Private contact phone numbers and exact home addresses are stored in access-restricted subcollections and are never exposed in public search results.</p>
            <p>2. Exact job service addresses are disclosed strictly to the customer, platform administrators, and the specific provider whose quotation is accepted.</p>
            <p>3. Provider NIC numbers, business registration documents, and private trade certificates are visible solely to the provider and authorized verification admins.</p>
            <p>4. MYSERVICE does not collect or store raw payment card numbers.</p>
          </div>
        )}

        {type === 'provider-guidelines' && (
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>1. Provide accurate Sri Lankan district coverage, honest LKR pricing, and realistic completion timelines in every quotation.</p>
            <p>2. Specialist categories such as Care & Support and regulated Professional Services require admin verification of valid qualifications before advertising.</p>
            <p>3. Respect customer address privacy and communicate professionally through MYSERVICE messaging.</p>
            <p>4. You are welcome to switch to Customer Mode anytime to hire other providers for your own needs.</p>
          </div>
        )}

        {type === 'customer-guidelines' && (
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>1. Describe job scopes clearly when posting requests so providers can submit accurate LKR quotations.</p>
            <p>2. Keep your exact street address inside the private address field rather than the public job title or description.</p>
            <p>3. Compare provider profiles, verification badges, and timelines before accepting a quotation.</p>
            <p>4. Mark bookings completed promptly and submit honest reviews based on real service delivery.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  usePageMeta('Page Not Found', 'The requested page was not found on MYSERVICE.');
  return (
    <div className="min-h-[70vh] bg-[#F5F8FD] flex items-center justify-center p-6">
      <div className="text-center max-w-md bg-white border border-slate-200 rounded-3xl p-8">
        <p className="font-mono text-sm font-bold text-[#2563EB] mb-2">404</p>
        <h1 className="font-display text-2xl font-bold text-[#142B4A] mb-2">Page Not Found</h1>
        <p className="text-sm text-slate-600 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};
