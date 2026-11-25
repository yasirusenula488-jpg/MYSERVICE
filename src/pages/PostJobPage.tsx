import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Lock, Send } from 'lucide-react';
import { usePageMeta } from '../components/PageMeta';
import { PhonePhotoPicker } from '../components/PhonePhotoPicker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CATEGORIES, getCategoryName } from '../data/categories';
import { getDistrictLabel, getProvinceLabel, SRI_LANKA_PROVINCES } from '../data/sriLankaLocations';
import { createJobRequest, fetchActiveCategories } from '../lib/marketplaceService';
import { ServiceCategory } from '../types/marketplace';

export const PostJobPage: React.FC = () => {
  const { firebaseUser, userProfile, privateContact } = useAuth();
  const { lang, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  usePageMeta('Post a Job', 'Publish your service request and receive transparent quotations from Sri Lankan professionals.');

  const initialCategory = searchParams.get('category') || 'home-repair';
  const initialDistrict = searchParams.get('district') || 'Colombo';
  const requestedProvider = searchParams.get('provider') || '';

  const matchedProv =
    SRI_LANKA_PROVINCES.find((p) => p.districts.some((d) => d.id === initialDistrict)) ||
    SRI_LANKA_PROVINCES[0];
  const matchedDist =
    matchedProv.districts.find((d) => d.id === initialDistrict) || matchedProv.districts[0];

  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [title, setTitle] = useState(requestedProvider ? `Request quote (${requestedProvider})` : '');
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [province, setProvince] = useState(matchedProv.id);
  const [district, setDistrict] = useState(matchedDist.id);
  const [city, setCity] = useState(matchedDist.cities[0] || 'Nugegoda');
  const [exactAddress, setExactAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [preferredTime, setPreferredTime] = useState('Morning (09:00 AM - 12:00 PM)');
  const [budgetMinLkr, setBudgetMinLkr] = useState('2500');
  const [budgetMaxLkr, setBudgetMaxLkr] = useState('10000');
  const [instructions, setInstructions] = useState('');
  const [photoThumbnails, setPhotoThumbnails] = useState<string[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveCategories().then((cats) => {
      setCategories(cats);
      const selected = cats.find((c) => c.id === categoryId) || cats[0];
      if (selected && !subcategory) {
        setSubcategory(selected.subcategories[0] || '');
      }
    });
  }, []);

  useEffect(() => {
    if (privateContact?.phone && !contactPhone) setContactPhone(privateContact.phone);
    if (privateContact?.privateAddress && !exactAddress) setExactAddress(privateContact.privateAddress);
  }, [privateContact]);

  const currentCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || categories[0],
    [categories, categoryId]
  );

  const currentProvince = useMemo(
    () => SRI_LANKA_PROVINCES.find((p) => p.id === province) || SRI_LANKA_PROVINCES[0],
    [province]
  );

  const currentDistrict = useMemo(
    () => currentProvince.districts.find((d) => d.id === district) || currentProvince.districts[0],
    [currentProvince, district]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    setError(null);
    if (title.trim().length < 4) {
      setError('Please enter a descriptive job title (at least 4 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setError('Please describe the job requirements (at least 10 characters).');
      return;
    }
    if (exactAddress.trim().length < 4) {
      setError('Please enter your private street address (kept hidden until you accept a quotation).');
      return;
    }

    setSubmitting(true);
    try {
      await createJobRequest({
        customerId: firebaseUser.uid,
        customerName: userProfile?.displayName || firebaseUser.displayName || 'Customer',
        title: title.trim(),
        categoryId,
        subcategory: subcategory || currentCategory?.subcategories[0] || 'General',
        description: description.trim(),
        province,
        district,
        city,
        exactAddress: exactAddress.trim(),
        contactPhone: contactPhone.trim(),
        preferredDate,
        preferredTime,
        budgetMinLkr: Number(budgetMinLkr) || 0,
        budgetMaxLkr: Number(budgetMaxLkr) || 0,
        instructions: instructions.trim(),
        photoThumbnails,
        photoCaptions,
      });
      navigate('/dashboard?tab=jobs&posted=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish job request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F5F8FD] min-h-screen py-8 pb-24 md:pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#142B4A] tracking-tight">
            {t('navPostJob')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
            Describe what you need and receive quotations from providers covering your Sri Lankan district.
          </p>
        </div>

        {!firebaseUser && (
          <div className="bg-[#EAF2FF] border border-blue-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-[#142B4A]">
              <p className="font-semibold">Sign in required to publish a job request</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Your job requests, quotations, and private address stay protected under your MYSERVICE account.
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

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 space-y-6"
        >
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Section 1: Service Scope */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider">1. What Do You Need?</h2>
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                Job Title *
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Inverter AC repair and gas top-up in Nugegoda"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Service Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    const nextCat = categories.find((c) => c.id === e.target.value);
                    setCategoryId(e.target.value);
                    setSubcategory(nextCat?.subcategories[0] || '');
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getCategoryName(c, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Subcategory *
                </label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  {(currentCategory?.subcategories || []).map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                Job Description *
              </label>
              <textarea
                required
                rows={4}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the scope, issue, property type, or materials needed..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <PhonePhotoPicker
              thumbnails={photoThumbnails}
              captions={photoCaptions}
              onChange={(thumbs, caps) => {
                setPhotoThumbnails(thumbs);
                setPhotoCaptions(caps);
              }}
              title="Attach Issue Photos (Optional)"
              helperText="Add up to 3 quick phone photos or notes so providers can quote accurately."
            />
          </div>

          {/* Section 2: Location & Private Address */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider">2. Location & Privacy</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Province *
                </label>
                <select
                  value={province}
                  onChange={(e) => {
                    const nextP = SRI_LANKA_PROVINCES.find((p) => p.id === e.target.value) || SRI_LANKA_PROVINCES[0];
                    setProvince(nextP.id);
                    setDistrict(nextP.districts[0].id);
                    setCity(nextP.districts[0].cities[0] || '');
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  {SRI_LANKA_PROVINCES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getProvinceLabel(p.id, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  District *
                </label>
                <select
                  value={district}
                  onChange={(e) => {
                    const nextD = currentProvince.districts.find((d) => d.id === e.target.value) || currentProvince.districts[0];
                    setDistrict(nextD.id);
                    setCity(nextD.cities[0] || '');
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  {currentProvince.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {getDistrictLabel(d.id, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  City / Area *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  {currentDistrict.cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#F5F8FD] border border-blue-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#142B4A]">
                <Lock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span>Private Service Address & Contact (Hidden from Public Search)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Exact Service Address *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    value={exactAddress}
                    onChange={(e) => setExactAddress(e.target.value)}
                    placeholder="House No, Street, Lane (shared only upon booking)"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    maxLength={30}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+94 77 000 0000"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Schedule & Budget */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider">3. Schedule & Budget</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Preferred Time Slot
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option>Morning (09:00 AM - 12:00 PM)</option>
                  <option>Afternoon (12:00 PM - 04:00 PM)</option>
                  <option>Evening (04:00 PM - 07:00 PM)</option>
                  <option>Flexible</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Min Budget (LKR)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={budgetMinLkr}
                  onChange={(e) => setBudgetMinLkr(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Max Budget (LKR)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={budgetMaxLkr}
                  onChange={(e) => setBudgetMaxLkr(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                Additional Instructions (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={600}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Parking notes, gate instructions, or special tools needed..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Matching providers in {district} will be notified
            </span>
            <button
              type="submit"
              disabled={submitting || !firebaseUser}
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Publishing...' : t('submitJob')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
