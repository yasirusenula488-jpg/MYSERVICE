import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';

interface PhonePhotoPickerProps {
  thumbnails: string[];
  captions: string[];
  onChange: (nextThumbnails: string[], nextCaptions: string[]) => void;
  title?: string;
  helperText?: string;
  maxPhotos?: number;
}

/**
 * Compresses a selected/captured phone photo via HTMLCanvasElement into a
 * lightweight JPEG Data URL strictly below 42,000 chars so it stores safely
 * within Firestore rules without requiring separate Storage rules.
 */
async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas compression is unavailable on this browser.'));
          return;
        }

        const maxDimSteps = [480, 380, 300, 240];
        const qualitySteps = [0.72, 0.58, 0.45, 0.35];

        for (const maxDim of maxDimSteps) {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          canvas.width = w;
          canvas.height = h;
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          for (const q of qualitySteps) {
            const dataUrl = canvas.toDataURL('image/jpeg', q);
            if (dataUrl.length <= 42000) {
              resolve(dataUrl);
              return;
            }
          }
        }

        reject(new Error('Image is still too large after compression. Please choose a simpler photo.'));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const PhonePhotoPicker: React.FC<PhonePhotoPickerProps> = ({
  thumbnails,
  captions,
  onChange,
  title = 'Photos (Optional)',
  helperText = 'Tap to take a photo or choose from your phone gallery (up to 3 lightweight previews).',
  maxPhotos = 3,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState('');
  const [captionInput, setCaptionInput] = useState('');

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError('');
    setCompressing(true);
    try {
      const remaining = Math.max(0, maxPhotos - thumbnails.length);
      const batch = files.slice(0, remaining);
      const nextThumbs = [...thumbnails];
      const nextCaps = [...captions];

      for (const file of batch) {
        if (!file.type.startsWith('image/')) {
          setError('Please select valid image files (JPG, PNG, or WEBP).');
          continue;
        }
        const compressed = await compressImageFile(file);
        nextThumbs.push(compressed);
        const cleanName = file.name.replace(/\.[^.]+$/, '').slice(0, 60) || `Photo ${nextThumbs.length}`;
        if (nextCaps.length < maxPhotos) {
          nextCaps.push(cleanName);
        }
      }
      onChange(nextThumbs.slice(0, maxPhotos), nextCaps.slice(0, maxPhotos));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to attach photo.');
    } finally {
      setCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveThumb = (idx: number) => {
    const nextThumbs = thumbnails.filter((_, i) => i !== idx);
    const nextCaps = captions.filter((_, i) => i !== idx);
    onChange(nextThumbs, nextCaps);
  };

  const handleAddCaptionOnly = () => {
    const trimmed = captionInput.trim().slice(0, 120);
    if (!trimmed) return;
    if (captions.length >= maxPhotos) return;
    onChange(thumbnails, [...captions, trimmed]);
    setCaptionInput('');
  };

  const handleRemoveCaptionOnly = (idx: number) => {
    onChange(
      thumbnails,
      captions.filter((_, i) => i !== idx)
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-[#F5F8FD] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#142B4A]">{title}</p>
          <p className="text-xs text-slate-600 mt-0.5">{helperText}</p>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-500 shrink-0">
          {thumbnails.length}/{maxPhotos}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Compressed Photo Thumbnails Grid */}
      {thumbnails.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          {thumbnails.map((src, idx) => (
            <div
              key={`${idx}-${src.slice(0, 24)}`}
              className="relative rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square"
            >
              <img
                src={src}
                alt={captions[idx] || `Attached photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveThumb(idx)}
                aria-label={`Remove photo ${idx + 1}`}
                className="absolute top-1.5 right-1.5 min-h-[32px] min-w-[32px] rounded-lg bg-[#142B4A]/85 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Phone Camera / Gallery Picker Button */}
      {thumbnails.length < maxPhotos && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
          <button
            type="button"
            disabled={compressing}
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-[#2563EB] text-sm font-semibold hover:bg-[#EAF2FF] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {compressing ? (
              <span>Optimizing photo for mobile...</span>
            ) : (
              <>
                <Camera className="w-4 h-4 shrink-0" />
                <span>Add Photo from Camera or Gallery</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Optional Caption Fallback */}
      <div className="pt-2 border-t border-slate-200/80 space-y-2">
        <p className="text-[11px] font-medium text-slate-500">
          Or add quick photo notes / labels (optional, up to {maxPhotos}):
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={captionInput}
            onChange={(e) => setCaptionInput(e.target.value)}
            maxLength={120}
            placeholder="e.g., Main kitchen switchboard photo"
            className="flex-1 min-w-0 min-h-[44px] px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#2563EB]"
          />
          <button
            type="button"
            disabled={!captionInput.trim() || captions.length >= maxPhotos}
            onClick={handleAddCaptionOnly}
            className="min-h-[44px] px-3.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#142B4A] hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
          >
            <ImagePlus className="w-4 h-4 text-[#2563EB]" />
            <span>Add</span>
          </button>
        </div>

        {captions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {captions.map((cap, idx) => (
              <span
                key={`${cap}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-[#142B4A]"
              >
                <span className="truncate max-w-[180px]">{cap}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCaptionOnly(idx)}
                  aria-label={`Remove caption ${cap}`}
                  className="text-slate-400 hover:text-red-600 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
