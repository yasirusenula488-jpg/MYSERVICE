import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { usePageMeta } from '../components/PageMeta';
import { ProviderCard } from '../components/ProviderCard';
import { SafeImage } from '../components/SafeImage';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CATEGORIES, getCategoryName } from '../data/categories';
import { FAQ_ITEMS, SAMPLE_LISTINGS, SAMPLE_PROVIDERS } from '../data/sampleCatalog';
import {
  getDistrictLabel,
  getProvinceLabel,
  SRI_LANKA_PROVINCES,
} from '../data/sriLankaLocations';
import {
  fetchActiveCategories,
  fetchActiveListings,
  fetchPublicAdminSettings,
  fetchPublicProviders,
} from '../lib/marketplaceService';
import { AdminSettings, ProviderProfile, ServiceCategory, ServiceListing } from '../types/marketplace';

export const HomePage: React.FC = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  usePageMeta('Sri Lanka’s Services, All in One Place', t('heroDescription'));

  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [providers, setProviders] = useState<ProviderProfile[]>(SAMPLE_PROVIDERS);
  const [listings, setListings] = useState<ServiceListing[]>(SAMPLE_LISTINGS);
  const [liveListings, setLiveListings] = useState<ServiceListing[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  // Hero Search State (Western Province focus by default, expandable to all 9 provinces)
  const [searchTerm, setSearchTerm] = useState('');
  const [province, setProvince] = useState('Western');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    fetchActiveCategories().then(setCategories);
    fetchPublicAdminSettings().then(setSettings);
    fetchPublicProviders()
      .then((live) => {
        if (live.length > 0) {
          setProviders([...live, ...SAMPLE_PROVIDERS]);
        }
      })
      .catch(() => {});
    fetchActiveListings()
      .then((live) => {
        setLiveListings(live);
        if (live.length > 0) {
          setListings([...live, ...SAMPLE_LISTINGS]);
        }
      })
      .catch(() => {});
  }, []);

  const liveCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of liveListings) {
      map[item.categoryId] = (map[item.categoryId] || 0) + 1;
    }
    return map;
  }, [liveListings]);

  const selectedProvinceObj = useMemo(
    () => SRI_LANKA_PROVINCES.find((p) => p.id === province),
    [province]
  );

  const availableDistricts = useMemo(
    () =>
      selectedProvinceObj
        ? selectedProvinceObj.districts
        : SRI_LANKA_PROVINCES.flatMap((p) => p.districts),
    [selectedProvinceObj]
  );

  const availableCities = useMemo(() => {
    if (!district) return [];
    const found = availableDistricts.find((d) => d.id === district);
    return found ? found.cities : [];
  }, [district, availableDistricts]);

  const keywordSuggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const subMatches = categories.flatMap((c) =>
      c.subcategories
        .filter((s) => s.toLowerCase().includes(q))
        .map((s) => ({ label: s, categoryId: c.id }))
    );
    return subMatches.slice(0, 6);
  }, [searchTerm, categories]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (province) params.set('province', province);
    if (district) params.set('district', district);
    if (city) params.set('city', city);
    navigate(`/services?${params.toString()}`);
  };

  const announcementText = useMemo(() => {
    if (!settings) return '';
    if (lang === 'si') return settings.announcement_si || settings.announcement_en || '';
    if (lang === 'ta') return settings.announcement_ta || settings.announcement_en || '';
    return settings.announcement_en || '';
  }, [settings, lang]);

  return (
    <div className="bg-white">
      {/* Subtle CMS Announcement Strip */}
      {announcementText && (
        <div className="bg-[#EAF2FF] border-b border-blue-100 text-[#142B4A] text-[11px] sm:text-xs py-1.5 sm:py-2 px-3 sm:px-4 text-center font-medium leading-snug">
          {announcementText}
        </div>
      )}

      {/* 1. MOBILE-FIRST COMPACT HERO SECTION */}
      <section className="bg-gradient-to-b from-[#F5F8FD] to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-[#2563EB] mb-2">
                {t('westernLaunchNote')}
              </p>
              <h1 className="font-display text-[28px] sm:text-4xl lg:text-[50px] font-extrabold text-[#142B4A] leading-[1.12] tracking-tight [text-wrap:balance] mb-2">
                {t('heroHeadline')}
              </h1>
              <p className="text-base sm:text-xl font-semibold text-[#2563EB] mb-2.5 leading-snug">
                {t('heroSinhalaLine')}
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mb-5">
                {t('heroDescription')}
              </p>

              {/* Thumb-Friendly Mobile Search Component (Vertical stack on phones) */}
              <form
                onSubmit={handleSearchSubmit}
                className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2.5 mb-5"
              >
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                    }}
                    placeholder={t('searchServicePlaceholder')}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F8FD] border border-slate-200 text-sm text-[#142B4A] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
                  />
                  {showSuggestions && keywordSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1">
                      {keywordSuggestions.map((s) => (
                        <button
                          key={`${s.categoryId}-${s.label}`}
                          type="button"
                          onMouseDown={() => {
                            setSearchTerm(s.label);
                            setShowSuggestions(false);
                          }}
                          className="w-full min-h-[44px] text-left px-4 py-2 text-sm text-[#142B4A] hover:bg-[#F5F8FD] flex items-center justify-between"
                        >
                          <span>{s.label}</span>
                          <span className="text-xs text-[#2563EB] font-medium">Select</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vertical Stack on Mobile, Horizontal Grid on Tablet/Desktop */}
                <div className="flex flex-col sm:grid sm:grid-cols-12 gap-2.5">
                  <select
                    aria-label={t('searchProvince')}
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value);
                      setDistrict('');
                      setCity('');
                    }}
                    className="sm:col-span-3 min-h-[44px] px-3 py-2.5 rounded-xl bg-[#F5F8FD] border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="">{t('searchAllProvinces')}</option>
                    {SRI_LANKA_PROVINCES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {getProvinceLabel(p.id, lang)}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label={t('searchDistrict')}
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setCity('');
                    }}
                    className="sm:col-span-3 min-h-[44px] px-3 py-2.5 rounded-xl bg-[#F5F8FD] border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="">{t('searchAllDistricts')}</option>
                    {availableDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {getDistrictLabel(d.id, lang)}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label={t('searchCity')}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!district}
                    className="sm:col-span-3 min-h-[44px] px-3 py-2.5 rounded-xl bg-[#F5F8FD] border border-slate-200 text-sm text-[#142B4A] disabled:opacity-60 focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="">{t('searchAllCities')}</option>
                    {availableCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="sm:col-span-3 min-h-[46px] px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    <span>{t('searchButton')}</span>
                  </button>
                </div>
              </form>

              {/* Two Clear Hero Actions */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3">
                <Link
                  to="/services"
                  className="min-h-[46px] inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors text-center"
                >
                  <span>{t('heroCtaFind')}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
                <Link
                  to="/become-provider"
                  className="min-h-[46px] inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-[#142B4A] text-xs sm:text-sm font-semibold hover:bg-[#F5F8FD] transition-colors text-center"
                >
                  <span>{t('heroCtaProvider')}</span>
                </Link>
              </div>
            </div>

            {/* Compact Hero Visual (Shorter height on phones so 15-category grid stays near viewport) */}
            <div className="lg:col-span-5">
              <div className="h-44 sm:h-64 lg:h-[340px] rounded-2xl overflow-hidden border border-slate-200 bg-[#EAF2FF] shadow-xs">
                <SafeImage
                  src="/src/assets/images/hero_srilanka_services_1795584342222.jpg"
                  alt="Sri Lankan service professionals across electrical, digital IT, residential maintenance, and care sectors"
                  className="w-full h-full object-cover"
                  fallbackLabel="MYSERVICE Sri Lanka"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ALL 15 SERVICE CATEGORIES — STRICTLY 2-COLUMN MOBILE GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display text-xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
              {t('secPopularCategories')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              All {categories.length} essential service categories across Sri Lanka. Tap any category to explore specialties.
            </p>
          </div>
          <Link
            to="/categories"
            className="text-xs sm:text-sm font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
          >
            Explore subcategories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* grid-cols-2 on mobile with equal widths & consistent card heights */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((cat) => {
            const liveCount = liveCountByCategory[cat.id] || 0;
            return (
              <Link
                key={cat.id}
                to={`/categories/${cat.id}`}
                className="group bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 hover:border-[#2563EB] hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[132px]"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center mb-3 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                    <CategoryIcon name={cat.iconName} className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-[13px] sm:text-sm text-[#142B4A] group-hover:text-[#2563EB] transition-colors leading-snug line-clamp-2">
                    {getCategoryName(cat, lang)}
                  </h3>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] sm:text-xs text-slate-500 flex items-center justify-between gap-1">
                  <span className="truncate tabular-nums">
                    {liveCount > 0
                      ? `${liveCount} active`
                      : `${cat.subcategories.length} specialties`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. HOW MYSERVICE WORKS */}
      <section className="bg-[#F5F8FD] border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="max-w-2xl mb-7 sm:mb-10">
            <h2 className="font-display text-xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
              {t('secHowItWorks')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
              Compare clear quotations and hire safely — or switch to Provider Mode on the same account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
              <p className="text-xs font-mono font-semibold text-[#2563EB] mb-1.5">01. Discover or Post</p>
              <h3 className="text-base sm:text-lg font-bold text-[#142B4A] mb-1.5">
                Search Services or Post a Job
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Browse providers by district across Colombo, Gampaha, Kalutara, or any of Sri Lanka’s 25 districts — or publish your job details privately.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
              <p className="text-xs font-mono font-semibold text-[#2563EB] mb-1.5">02. Compare & Chat</p>
              <h3 className="text-base sm:text-lg font-bold text-[#142B4A] mb-1.5">
                Review Quotations Transparently
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Compare provider pricing in LKR, completion estimates, and admin verification status before chatting directly inside MYSERVICE.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
              <p className="text-xs font-mono font-semibold text-[#2563EB] mb-1.5">03. Book & Review</p>
              <h3 className="text-base sm:text-lg font-bold text-[#142B4A] mb-1.5">
                Confirm Booking & Track Progress
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your exact service address stays private until you accept a quotation. Track job completion and leave verified feedback afterward.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED SERVICE PROVIDERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h2 className="font-display text-xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
              {t('secFeaturedProviders')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Western Province professionals and sample demonstration profiles.
            </p>
          </div>
          <Link
            to="/professionals"
            className="text-xs sm:text-sm font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
          >
            View all professionals
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {providers.slice(0, 3).map((prov) => (
            <ProviderCard key={prov.id} provider={prov} categories={categories} />
          ))}
        </div>
      </section>

      {/* 5. POPULAR SERVICES NEAR YOU (WESTERN PROVINCE) */}
      <section className="bg-[#F5F8FD] border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <h2 className="font-display text-xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
                {t('secPopularServices')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Featured Western Province listings (Colombo, Gampaha, Kalutara) with transparent LKR rates.
              </p>
            </div>
            <Link
              to="/services"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-[#2563EB] hover:border-[#2563EB] inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              <span>{t('viewAllServices')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {listings.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#2563EB] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[16/10] sm:aspect-[4/3] bg-[#EAF2FF] overflow-hidden">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      fallbackLabel={item.subcategory}
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                      <span className="truncate">{item.subcategory}</span>
                      {item.isSample && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-semibold shrink-0">{t('sampleDemoLabel')}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-bold text-[#142B4A] text-sm sm:text-base line-clamp-2 mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.city}, {item.district}</span>
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-slate-100 bg-[#F5F8FD]/40 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-mono font-bold text-[#142B4A] tabular-nums">
                      LKR {item.priceLkr.toLocaleString()}
                    </span>
                    <span className="text-slate-500 ml-1">/{item.priceUnit || 'starting'}</span>
                  </div>
                  <Link
                    to={`/providers/${item.providerId}`}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[#2563EB] font-semibold hover:border-[#2563EB] inline-flex items-center shrink-0"
                  >
                    {t('viewProfile')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. POST YOUR JOB BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="bg-[#142B4A] text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl sm:text-3xl font-bold tracking-tight mb-2.5">
              {t('secPostJobBanner')}
            </h2>
            <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
              Need an urgent plumber in Nugegoda, an office deep clean in Colombo 03, or a wedding photographer in Negombo? Post your job once and let matching Sri Lankan professionals send competitive quotations.
            </p>
          </div>
          <Link
            to="/post-job"
            className="w-full sm:w-auto min-h-[46px] px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center"
          >
            {t('navPostJob')}
          </Link>
        </div>
      </section>

      {/* 7. WHY CHOOSE MYSERVICE & VERIFIED PROFESSIONALS */}
      <section className="bg-[#F5F8FD] border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-xl sm:text-3xl font-bold text-[#142B4A] tracking-tight mb-4">
              {t('secWhyChoose')}
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
                <h3 className="font-semibold text-[#142B4A] text-sm sm:text-base mb-1">
                  One Account, Two Seamless Modes
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Switch between Customer Mode and Provider Mode instantly. Service providers can also post personal job requests and hire other experts on the same account.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
                <h3 className="font-semibold text-[#142B4A] text-sm sm:text-base mb-1">
                  Trilingual Experience (English · සිංහල · தமிழ்)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Built from the ground up with Unicode-safe Sinhala, Tamil, and English navigation, forms, categories, and notifications.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
                <h3 className="font-semibold text-[#142B4A] text-sm sm:text-base mb-1">
                  Strict Address & Document Privacy
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Your exact home address and provider NIC/certificate files are never exposed publicly. Addresses are shared only after you accept a quotation.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#142B4A] mb-2.5">
                {t('secVerifiedPros')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                Every service provider begins with transparent verification status tracking. Verified badges appear strictly after an authorized MYSERVICE administrator reviews the provider’s identity and trade credentials.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#142B4A] mb-6">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Admin-reviewed NIC / BR and trade certificates</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Specialist checks for Care & Support and regulated roles</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Reviews accepted exclusively from completed bookings</span>
                </li>
              </ul>
            </div>
            <Link
              to="/guidelines/provider"
              className="text-xs sm:text-sm font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1 min-h-[40px]"
            >
              Read our Provider Verification Guidelines
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. CUSTOMER REVIEWS TRANSPARENCY & 9. BECOME A PROVIDER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center mb-4">
              <Star className="w-5 h-5" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#142B4A] mb-2">
              {t('secCustomerReviews')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              MYSERVICE never publishes fabricated ratings or synthetic testimonials. Verified customer reviews appear here and on provider profiles strictly after real marketplace bookings are marked completed.
            </p>
          </div>
          <Link
            to="/professionals"
            className="text-xs sm:text-sm font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1 min-h-[40px]"
          >
            Browse provider profiles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="lg:col-span-7 bg-[#EAF2FF] border border-blue-200/70 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[#2563EB] mb-1.5">For Professionals & SMEs</p>
            <h2 className="font-display text-xl sm:text-3xl font-bold text-[#142B4A] mb-2.5">
              {t('secBecomeProvider')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-5">
              Register free on MYSERVICE, choose your Western Province or islandwide districts, list your services, receive real customer job alerts, and grow with flexible Free, Pro, or Business plans.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/become-provider"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
            >
              {t('navBecomeProvider')}
            </Link>
            <Link
              to="/how-it-works"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-blue-200 text-[#142B4A] text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors inline-flex items-center justify-center"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* 10. FAQ SECTION */}
      <section className="bg-[#F5F8FD] border-t border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="font-display text-xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
              {t('secFaq')}
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, idx) => {
              const q = lang === 'si' ? faq.q_si : lang === 'ta' ? faq.q_ta : faq.q_en;
              const a = lang === 'si' ? faq.a_si : lang === 'ta' ? faq.a_ta : faq.a_en;
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full min-h-[52px] px-5 py-3.5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[#142B4A] hover:bg-slate-50/70"
                  >
                    <span>{q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
          <h2 className="font-display text-xl sm:text-3xl font-bold text-[#142B4A] mb-2.5">
            {t('secFinalCta')}
          </h2>
          <p className="text-xs sm:text-base text-slate-600 max-w-xl mx-auto mb-6">
            {t('tagline')} {t('secondaryTagline')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/services"
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
            >
              {t('heroCtaFind')}
            </Link>
            <Link
              to="/post-job"
              className="min-h-[44px] px-6 py-2.5 rounded-xl border border-slate-200 text-[#142B4A] text-sm font-semibold hover:bg-[#F5F8FD] transition-colors inline-flex items-center justify-center"
            >
              {t('navPostJob')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
