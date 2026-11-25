import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { usePageMeta } from '../components/PageMeta';
import { PhonePhotoPicker } from '../components/PhonePhotoPicker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CATEGORIES, getCategoryName } from '../data/categories';
import { ALL_DISTRICTS, getDistrictLabel, getProvinceLabel, SRI_LANKA_PROVINCES } from '../data/sriLankaLocations';
import { fetchActiveCategories, submitProviderOnboarding } from '../lib/marketplaceService';
import { ServiceCategory } from '../types/marketplace';

const WORKING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STEP_LABELS = ['Basic Info', 'Location & Skills', 'Experience & Photos', 'Verification'];

export const BecomeProviderPage: React.FC = () => {
  const { firebaseUser, userProfile, privateContact, providerProfile, setWorkspaceMode } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  usePageMeta('Become a Service Provider', 'Register as a service provider on MYSERVICE using your existing account.');

  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('Western');
  const [district, setDistrict] = useState('Colombo');
  const [city, setCity] = useState('Nugegoda');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['home-repair']);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(['Electricians']);
  const [coverageDistricts, setCoverageDistricts] = useState<string[]>(['Colombo', 'Gampaha']);
  const [yearsExperience, setYearsExperience] = useState('3');
  const [bio, setBio] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [startingPriceLkr, setStartingPriceLkr] = useState('2500');
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [timeSlots, setTimeSlots] = useState('08:30 AM - 06:00 PM');
  const [photoThumbnails, setPhotoThumbnails] = useState<string[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);
  const [nicOrRegNumber, setNicOrRegNumber] = useState('');
  const [certificateSummary, setCertificateSummary] = useState('');
  const [documentNamesText, setDocumentNamesText] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (providerProfile) {
      setFullName(providerProfile.fullName);
      setBusinessName(providerProfile.businessName || '');
      setProvince(providerProfile.province);
      setDistrict(providerProfile.district);
      setCity(providerProfile.city);
      setSelectedCategories(providerProfile.categoryIds);
      setSelectedSubcategories(providerProfile.subcategories || []);
      setCoverageDistricts(providerProfile.coverageDistricts);
      setYearsExperience(String(providerProfile.yearsExperience));
      setBio(providerProfile.bio);
      setQualifications(providerProfile.qualifications || '');
      setStartingPriceLkr(String(providerProfile.startingPriceLkr));
      setWorkingDays(providerProfile.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setTimeSlots(providerProfile.timeSlots || '08:30 AM - 06:00 PM');
      setPhotoThumbnails(providerProfile.photoThumbnails || []);
      setPhotoCaptions(providerProfile.photoCaptions || []);
    } else if (firebaseUser) {
      setFullName(userProfile?.displayName || firebaseUser.displayName || '');
    }
    if (firebaseUser?.email && !email) setEmail(firebaseUser.email);
    if (privateContact?.phone && !phone) setPhone(privateContact.phone);
  }, [providerProfile, firebaseUser, userProfile, privateContact]);

  const currentProvince = useMemo(
    () => SRI_LANKA_PROVINCES.find((p) => p.id === province) || SRI_LANKA_PROVINCES[0],
    [province]
  );

  const currentDistrict = useMemo(
    () => currentProvince.districts.find((d) => d.id === district) || currentProvince.districts[0],
    [currentProvince, district]
  );

  const availableSubcategories = useMemo(() => {
    return categories
      .filter((c) => selectedCategories.includes(c.id))
      .flatMap((c) => c.subcategories);
  }, [categories, selectedCategories]);

  const toggleItem = (list: string[], value: string, max: number, setter: (v: string[]) => void) => {
    if (list.includes(value)) {
      if (list.length <= 1) return;
      setter(list.filter((i) => i !== value));
    } else if (list.length < max) {
      setter([...list, value]);
    }
  };

  const validateStep = (targetStep: number): boolean => {
    setError(null);
    if (targetStep === 1) {
      if (fullName.trim().length < 2) {
        setError('Please enter your full name.');
        return false;
      }
      if (phone.trim().length < 7) {
        setError('Please enter a valid Sri Lankan contact phone number.');
        return false;
      }
      if (!email.trim().includes('@')) {
        setError('Please enter a valid email address.');
        return false;
      }
    }
    if (targetStep === 2) {
      if (selectedCategories.length === 0) {
        setError('Please select at least one service category.');
        return false;
      }
      if (coverageDistricts.length === 0) {
        setError('Please select at least one district you cover.');
        return false;
      }
    }
    if (targetStep === 3) {
      if (bio.trim().length < 10) {
        setError('Please write a professional description of at least 10 characters.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) {
      navigate('/login');
      return;
    }
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    if (!providerProfile && nicOrRegNumber.trim().length < 4) {
      setError('Please enter your NIC or Business Registration number for private admin verification.');
      return;
    }

    setSubmitting(true);
    try {
      await submitProviderOnboarding({
        uid: firebaseUser.uid,
        userProfile,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        photoURL: userProfile.photoURL || firebaseUser.photoURL || '',
        email: email.trim() || firebaseUser.email || '',
        phone: phone.trim(),
        province,
        district,
        city,
        categoryIds: selectedCategories,
        subcategories: selectedSubcategories,
        coverageDistricts,
        yearsExperience: Number(yearsExperience) || 0,
        bio: bio.trim(),
        qualifications: qualifications.trim(),
        startingPriceLkr: Number(startingPriceLkr) || 0,
        workingDays,
        timeSlots: timeSlots.trim(),
        portfolioUrls: [],
        photoThumbnails,
        photoCaptions,
        nicOrRegNumber: nicOrRegNumber.trim() || 'ON_FILE',
        certificateSummary: certificateSummary.trim(),
        documentNames: documentNamesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setWorkspaceMode('provider');
      navigate('/provider-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save provider registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F5F8FD] min-h-screen py-8 pb-24 md:pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#142B4A] tracking-tight">
            {providerProfile ? 'Update Provider Registration' : t('navBecomeProvider')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
            Activate Provider Mode on your existing MYSERVICE account. You retain full Customer Mode access to hire other professionals at any time.
          </p>
        </div>

        {!firebaseUser && (
          <div className="bg-[#EAF2FF] border border-blue-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-[#142B4A]">
              <p className="font-semibold">Sign in first to activate Provider Mode</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Use your Google account once to unlock both Customer and Provider dashboards.
              </p>
            </div>
            <Link
              to="/login"
              className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold whitespace-nowrap self-start sm:self-auto"
            >
              {t('navSignIn')}
            </Link>
          </div>
        )}

        {providerProfile && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-[#142B4A]">Verification Status: </span>
                <span className="font-semibold text-[#2563EB]">
                  {t(`status_${providerProfile.verificationStatus}`)}
                </span>
                {providerProfile.rejectionReason && (
                  <p className="text-xs text-red-600 mt-0.5">{providerProfile.rejectionReason}</p>
                )}
              </div>
            </div>
            <Link
              to="/provider-dashboard"
              className="min-h-[40px] inline-flex items-center px-4 py-2 rounded-xl bg-[#142B4A] text-white text-xs font-semibold"
            >
              Open Provider Dashboard
            </Link>
          </div>
        )}

        {/* 4-Step Mobile Progress Indicator */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 mb-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#142B4A] mb-2">
            <span>Step {step} of 4: {STEP_LABELS[step - 1]}</span>
            <span className="font-mono text-[#2563EB]">{Math.round((step / 4) * 100)}%</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {STEP_LABELS.map((label, idx) => {
              const sNum = idx + 1;
              const isDoneOrActive = sNum <= step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (sNum < step || providerProfile) {
                      setError(null);
                      setStep(sNum);
                    }
                  }}
                  className="text-left group focus:outline-none"
                >
                  <div
                    className={`h-2 rounded-full transition-colors ${
                      isDoneOrActive ? 'bg-[#2563EB]' : 'bg-slate-200'
                    }`}
                  />
                  <span className="hidden sm:block text-[11px] text-slate-500 mt-1 truncate">
                    {sNum}. {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* STEP 1: Basic Info & Contact */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#142B4A]">Personal & Business Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                    Business Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., LankaVolt Electricals"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location, Categories & Coverage */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-[#142B4A]">Base Location & Service Categories</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">Province *</label>
                  <select
                    value={province}
                    onChange={(e) => {
                      const p = SRI_LANKA_PROVINCES.find((x) => x.id === e.target.value) || SRI_LANKA_PROVINCES[0];
                      setProvince(p.id);
                      setDistrict(p.districts[0].id);
                      setCity(p.districts[0].cities[0] || '');
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {SRI_LANKA_PROVINCES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {getProvinceLabel(p.id, lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">Base District *</label>
                  <select
                    value={district}
                    onChange={(e) => {
                      const d = currentProvince.districts.find((x) => x.id === e.target.value) || currentProvince.districts[0];
                      setDistrict(d.id);
                      setCity(d.cities[0] || '');
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {currentProvince.districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {getDistrictLabel(d.id, lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">City / Area *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {currentDistrict.cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-2">
                  Service Categories (Select up to 5) *
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const active = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleItem(selectedCategories, cat.id, 5, setSelectedCategories)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-[#F5F8FD] text-[#142B4A] border-slate-200 hover:border-[#2563EB]'
                        }`}
                      >
                        {getCategoryName(cat, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-2">
                  Specialties / Subcategories
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableSubcategories.map((sub) => {
                    const active = selectedSubcategories.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleItem(selectedSubcategories, sub, 20, setSelectedSubcategories)}
                        className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                          active
                            ? 'bg-[#142B4A] text-white border-[#142B4A]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-2">
                  Service Coverage Districts (All 25 Sri Lankan Districts) *
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 rounded-xl bg-[#F5F8FD] border border-slate-200">
                  {ALL_DISTRICTS.map((d) => {
                    const active = coverageDistricts.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleItem(coverageDistricts, d.id, 25, setCoverageDistricts)}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {getDistrictLabel(d.id, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Experience, Pricing, Bio & Photos */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-[#142B4A]">Experience, Pricing & Work Samples</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={80}
                    required
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                    Starting Price (LKR) *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    required
                    value={startingPriceLkr}
                    onChange={(e) => setStartingPriceLkr(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                    Available Time Slots
                  </label>
                  <input
                    type="text"
                    value={timeSlots}
                    onChange={(e) => setTimeSlots(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-2">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {WORKING_DAYS.map((day) => {
                    const active = workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleItem(workingDays, day, 7, setWorkingDays)}
                        className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold border ${
                          active ? 'bg-[#EAF2FF] text-[#2563EB] border-blue-200' : 'bg-white text-slate-500 border-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Professional Description *
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={1500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your experience, tools, safety standards, and services offered..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Qualifications & Certifications (Public Summary)
                </label>
                <input
                  type="text"
                  maxLength={600}
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g., NVQ Level 4, Chartered Accountant, BSc Nursing"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <PhonePhotoPicker
                thumbnails={photoThumbnails}
                captions={photoCaptions}
                onChange={(thumbs, caps) => {
                  setPhotoThumbnails(thumbs);
                  setPhotoCaptions(caps);
                }}
                title="Work Sample Photos (Optional)"
                helperText="Upload up to 3 compressed work sample photos or project labels from your phone."
              />
            </div>
          )}

          {/* STEP 4: Private Verification & Submit */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-[#142B4A]">Private Verification & Activation</h2>

              <div className="bg-[#F5F8FD] border border-blue-100 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#142B4A]">
                  <Lock className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <span>Private Verification Credentials (Never Displayed on Public Profiles)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      NIC / Business Registration Number *
                    </label>
                    <input
                      type="text"
                      required={!providerProfile}
                      value={nicOrRegNumber}
                      onChange={(e) => setNicOrRegNumber(e.target.value)}
                      placeholder="Only visible to authorized admins"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Supporting Document References (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={documentNamesText}
                      onChange={(e) => setDocumentNamesText(e.target.value)}
                      placeholder="NIC_Front.pdf, NVQ_Certificate.pdf"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Verification Notes for Admin Reviewer
                  </label>
                  <input
                    type="text"
                    value={certificateSummary}
                    onChange={(e) => setCertificateSummary(e.target.value)}
                    placeholder="Trade license, institution name, or specialist registration number"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#EAF2FF]/60 border border-blue-100 p-4 text-xs text-[#142B4A] space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Ready to Activate Provider Mode
                </p>
                <p className="text-slate-600">
                  {fullName || 'Provider'} · {city}, {district} · {selectedCategories.length} categories · Starting LKR {Number(startingPriceLkr || 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((s) => Math.max(1, s - 1));
                }}
                className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-[#142B4A] hover:bg-[#F5F8FD] inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <span className="text-xs text-slate-500">Free registration</span>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !firebaseUser}
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : providerProfile ? 'Save Provider Profile' : 'Submit & Activate Provider Mode'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
