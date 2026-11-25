import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ShieldCheck, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CATEGORIES, getCategoryName } from '../data/categories';
import { getDistrictLabel } from '../data/sriLankaLocations';
import { ProviderProfile, ServiceCategory } from '../types/marketplace';
import { SafeImage } from './SafeImage';

interface ProviderCardProps {
  provider: ProviderProfile;
  categories?: ServiceCategory[];
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  categories = DEFAULT_CATEGORIES,
}) => {
  const { lang, t } = useLanguage();

  const primaryCategoryId = provider.categoryIds?.[0] || '';
  const primaryCat = categories.find((c) => c.id === primaryCategoryId);
  const categoryLabel = primaryCat
    ? getCategoryName(primaryCat, lang)
    : provider.subcategories?.[0] || 'Professional Service';

  const displayName = provider.businessName || provider.fullName;
  const locationLabel = `${provider.city ? `${provider.city}, ` : ''}${getDistrictLabel(provider.district, lang)}`;
  const coverageLabel =
    provider.coverageDistricts && provider.coverageDistricts.length > 1
      ? `+${provider.coverageDistricts.length - 1} more districts`
      : '';

  const quoteHref = `/post-job?category=${encodeURIComponent(primaryCategoryId)}&district=${encodeURIComponent(provider.district)}&provider=${encodeURIComponent(displayName)}`;

  return (
    <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-[#2563EB]/60 transition-colors flex flex-col justify-between h-full">
      <div>
        {/* Clean visual header */}
        <div className="relative aspect-[16/10] bg-[#EAF2FF] overflow-hidden">
          <SafeImage
            src={provider.photoURL}
            alt={displayName}
            className="w-full h-full object-cover"
            fallbackLabel={displayName}
          />
          {provider.isSample && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-amber-50/95 border border-amber-200 text-amber-800 text-[11px] font-semibold">
              {t('sampleDemoLabel')}
            </span>
          )}
          {provider.verificationStatus === 'verified' && !provider.isSample && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-50/95 border border-emerald-200 text-emerald-700 text-[11px] font-semibold inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              {t('status_verified')}
            </span>
          )}
        </div>

        {/* Clean vertical hierarchy */}
        <div className="p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#2563EB] truncate">{categoryLabel}</span>
            {typeof provider.reviewCount === 'number' && provider.reviewCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#142B4A] shrink-0 tabular-nums">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {Number(provider.ratingAvg || 0).toFixed(1)}
                <span className="text-slate-500 font-normal">({provider.reviewCount})</span>
              </span>
            ) : null}
          </div>

          <h3 className="text-base sm:text-lg font-bold text-[#142B4A] leading-snug line-clamp-1">
            {displayName}
          </h3>

          <p className="text-xs text-slate-600 flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">
              {locationLabel}
              {coverageLabel ? ` · ${coverageLabel}` : ''}
            </span>
          </p>

          <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {provider.bio}
          </p>

          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
            {provider.startingPriceLkr > 0 && (
              <span className="font-mono font-bold text-[#142B4A] tabular-nums">
                From LKR {provider.startingPriceLkr.toLocaleString()}
              </span>
            )}
            {provider.workingDays && provider.workingDays.length > 0 && (
              <span className="text-slate-500 inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {provider.workingDays.slice(0, 2).join(', ')}
                {provider.workingDays.length > 2 ? ` +${provider.workingDays.length - 2}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dual Touch-Friendly CTAs (>= 44px) */}
      <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-[#F5F8FD]/50 grid grid-cols-2 gap-2.5">
        <Link
          to={`/providers/${provider.id}`}
          className="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#2563EB] text-[#142B4A] text-xs font-semibold flex items-center justify-center text-center transition-colors"
        >
          {t('viewProfile')}
        </Link>
        <Link
          to={quoteHref}
          className="min-h-[44px] px-3 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center text-center transition-colors"
        >
          {t('requestQuote')}
        </Link>
      </div>
    </article>
  );
};
