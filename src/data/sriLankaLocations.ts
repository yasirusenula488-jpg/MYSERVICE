import { LanguageCode } from '../types/marketplace';

export interface DistrictEntry {
  id: string;
  name_en: string;
  name_si: string;
  name_ta: string;
  cities: string[];
}

export interface ProvinceEntry {
  id: string;
  name_en: string;
  name_si: string;
  name_ta: string;
  isLaunchFocus?: boolean;
  districts: DistrictEntry[];
}

export const SRI_LANKA_PROVINCES: ProvinceEntry[] = [
  {
    id: 'Western',
    name_en: 'Western Province',
    name_si: 'බස්නාහිර පළාත',
    name_ta: 'மேல் மாகாணம்',
    isLaunchFocus: true,
    districts: [
      {
        id: 'Colombo',
        name_en: 'Colombo',
        name_si: 'කොළඹ',
        name_ta: 'கொழும்பு',
        cities: [
          'Colombo 01 - Fort',
          'Colombo 03 - Kollupitiya',
          'Colombo 04 - Bambalapitiya',
          'Colombo 05 - Havelock Town',
          'Colombo 06 - Wellawatte',
          'Colombo 07 - Cinnamon Gardens',
          'Dehiwala',
          'Mount Lavinia',
          'Nugegoda',
          'Maharagama',
          'Sri Jayawardenepura Kotte',
          'Battaramulla',
          'Rajagiriya',
          'Malabe',
          'Kaduwela',
          'Moratuwa',
          'Piliyandala',
          'Homagama',
        ],
      },
      {
        id: 'Gampaha',
        name_en: 'Gampaha',
        name_si: 'ගම්පහ',
        name_ta: 'கம்பஹா',
        cities: [
          'Gampaha',
          'Negombo',
          'Wattala',
          'Kelaniya',
          'Kadawatha',
          'Ja-Ela',
          'Ragama',
          'Kiribathgoda',
          'Minuwangoda',
          'Nittambuwa',
          'Katunayake',
          'Veyangoda',
        ],
      },
      {
        id: 'Kalutara',
        name_en: 'Kalutara',
        name_si: 'කළුතර',
        name_ta: 'களுத்துறை',
        cities: [
          'Kalutara',
          'Panadura',
          'Horana',
          'Beruwala',
          'Aluthgama',
          'Bandaragama',
          'Matugama',
          'Wadduwa',
        ],
      },
    ],
  },
  {
    id: 'Central',
    name_en: 'Central Province',
    name_si: 'මධ්‍යම පළාත',
    name_ta: 'மத்திய மாகாணம்',
    districts: [
      {
        id: 'Kandy',
        name_en: 'Kandy',
        name_si: 'මහනුවර',
        name_ta: 'கண்டி',
        cities: ['Kandy', 'Peradeniya', 'Katugastota', 'Gampola', 'Nawalapitiya', 'Kundasale'],
      },
      {
        id: 'Matale',
        name_en: 'Matale',
        name_si: 'මාතලේ',
        name_ta: 'மாத்தளை',
        cities: ['Matale', 'Dambulla', 'Galewela', 'Ukuwela'],
      },
      {
        id: 'Nuwara Eliya',
        name_en: 'Nuwara Eliya',
        name_si: 'නුවරඑළිය',
        name_ta: 'நுவரெலியா',
        cities: ['Nuwara Eliya', 'Hatton', 'Talawakelle', 'Bandarawela Border'],
      },
    ],
  },
  {
    id: 'Southern',
    name_en: 'Southern Province',
    name_si: 'දකුණු පළාත',
    name_ta: 'தென் மாகாணம்',
    districts: [
      {
        id: 'Galle',
        name_en: 'Galle',
        name_si: 'ගාල්ල',
        name_ta: 'காலி',
        cities: ['Galle', 'Hikkaduwa', 'Ambalangoda', 'Unawatuna', 'Karapitiya'],
      },
      {
        id: 'Matara',
        name_en: 'Matara',
        name_si: 'මාතර',
        name_ta: 'மாத்தறை',
        cities: ['Matara', 'Weligama', 'Akuressa', 'Dikwella'],
      },
      {
        id: 'Hambantota',
        name_en: 'Hambantota',
        name_si: 'හම්බන්තොට',
        name_ta: 'அம்பாந்தோட்டை',
        cities: ['Hambantota', 'Tangalle', 'Tissamaharama', 'Ambalantota'],
      },
    ],
  },
  {
    id: 'Northern',
    name_en: 'Northern Province',
    name_si: 'උතුරු පළාත',
    name_ta: 'வட மாகாணம்',
    districts: [
      {
        id: 'Jaffna',
        name_en: 'Jaffna',
        name_si: 'යාපනය',
        name_ta: 'யாழ்ப்பாணம்',
        cities: ['Jaffna', 'Nallur', 'Chavakachcheri', 'Point Pedro'],
      },
      {
        id: 'Kilinochchi',
        name_en: 'Kilinochchi',
        name_si: 'කිලිනොච්චි',
        name_ta: 'கிளிநொச்சி',
        cities: ['Kilinochchi', 'Paranthan', 'Pooneryn'],
      },
      {
        id: 'Mannar',
        name_en: 'Mannar',
        name_si: 'මන්නාරම',
        name_ta: 'மன்னார்',
        cities: ['Mannar', 'Talaimannar', 'Nanattan'],
      },
      {
        id: 'Mullaitivu',
        name_en: 'Mullaitivu',
        name_si: 'මුලතිව්',
        name_ta: 'முல்லைத்தீவு',
        cities: ['Mullaitivu', 'Puthukkudiyiruppu', 'Oddusuddan'],
      },
      {
        id: 'Vavuniya',
        name_en: 'Vavuniya',
        name_si: 'වවුනියාව',
        name_ta: 'வவுனியா',
        cities: ['Vavuniya', 'Cheddikulam', 'Nedunkeni'],
      },
    ],
  },
  {
    id: 'Eastern',
    name_en: 'Eastern Province',
    name_si: 'නැගෙනහිර පළාත',
    name_ta: 'கிழக்கு மாகாணம்',
    districts: [
      {
        id: 'Trincomalee',
        name_en: 'Trincomalee',
        name_si: 'ත්‍රිකුණාමලය',
        name_ta: 'திருகோணமலை',
        cities: ['Trincomalee', 'Kinniya', 'Kantale', 'Mutur'],
      },
      {
        id: 'Batticaloa',
        name_en: 'Batticaloa',
        name_si: 'මඩකලපුව',
        name_ta: 'மட்டக்களப்பு',
        cities: ['Batticaloa', 'Kattankudy', 'Eravur', 'Valaichchenai'],
      },
      {
        id: 'Ampara',
        name_en: 'Ampara',
        name_si: 'අම්පාර',
        name_ta: 'அம்பாறை',
        cities: ['Ampara', 'Kalmunai', 'Sainthamaruthu', 'Akkaraipattu'],
      },
    ],
  },
  {
    id: 'North Western',
    name_en: 'North Western Province',
    name_si: 'වයඹ පළාත',
    name_ta: 'வடமேல் மாகாணம்',
    districts: [
      {
        id: 'Kurunegala',
        name_en: 'Kurunegala',
        name_si: 'කුරුණෑගල',
        name_ta: 'குருநாகல்',
        cities: ['Kurunegala', 'Kuliyapitiya', 'Narammala', 'Pannala', 'Wariyapola'],
      },
      {
        id: 'Puttalam',
        name_en: 'Puttalam',
        name_si: 'පුත්තලම',
        name_ta: 'புத்தளம்',
        cities: ['Puttalam', 'Chilaw', 'Wennappuwa', 'Marawila', 'Dankotuwa'],
      },
    ],
  },
  {
    id: 'North Central',
    name_en: 'North Central Province',
    name_si: 'උතුරු මැද පළාත',
    name_ta: 'வடமத்திய மாகாணம்',
    districts: [
      {
        id: 'Anuradhapura',
        name_en: 'Anuradhapura',
        name_si: 'අනුරාධපුරය',
        name_ta: 'அனுராதபுரம்',
        cities: ['Anuradhapura', 'Kekirawa', 'Tambuttegama', 'Medawachchiya'],
      },
      {
        id: 'Polonnaruwa',
        name_en: 'Polonnaruwa',
        name_si: 'පොළොන්නරුව',
        name_ta: 'பொலன்னறுவை',
        cities: ['Polonnaruwa', 'Kaduruwela', 'Hingurakgoda', 'Medirigiriya'],
      },
    ],
  },
  {
    id: 'Uva',
    name_en: 'Uva Province',
    name_si: 'ඌව පළාත',
    name_ta: 'ஊவா மாகாணம்',
    districts: [
      {
        id: 'Badulla',
        name_en: 'Badulla',
        name_si: 'බදුල්ල',
        name_ta: 'பதுளை',
        cities: ['Badulla', 'Bandarawela', 'Ella', 'Haputale', 'Welimada'],
      },
      {
        id: 'Monaragala',
        name_en: 'Monaragala',
        name_si: 'මොණරාගල',
        name_ta: 'மொனராகலை',
        cities: ['Monaragala', 'Wellawaya', 'Bibile', 'Kataragama'],
      },
    ],
  },
  {
    id: 'Sabaragamuwa',
    name_en: 'Sabaragamuwa Province',
    name_si: 'සබරගමුව පළාත',
    name_ta: 'சபரகமுவ மாகாணம்',
    districts: [
      {
        id: 'Ratnapura',
        name_en: 'Ratnapura',
        name_si: 'රත්නපුර',
        name_ta: 'இரத்தினபுரி',
        cities: ['Ratnapura', 'Balangoda', 'Embilipitiya', 'Pelmadulla'],
      },
      {
        id: 'Kegalle',
        name_en: 'Kegalle',
        name_si: 'කෑගල්ල',
        name_ta: 'கேகாலை',
        cities: ['Kegalle', 'Mawanella', 'Warakapola', 'Rambukkana'],
      },
    ],
  },
];

export const ALL_DISTRICTS: DistrictEntry[] = SRI_LANKA_PROVINCES.flatMap((p) => p.districts);

export function getProvinceLabel(provinceId: string, lang: LanguageCode): string {
  const found = SRI_LANKA_PROVINCES.find((p) => p.id === provinceId);
  if (!found) return provinceId;
  return lang === 'si' ? found.name_si : lang === 'ta' ? found.name_ta : found.name_en;
}

export function getDistrictLabel(districtId: string, lang: LanguageCode): string {
  const found = ALL_DISTRICTS.find((d) => d.id === districtId);
  if (!found) return districtId;
  return lang === 'si' ? found.name_si : lang === 'ta' ? found.name_ta : found.name_en;
}
