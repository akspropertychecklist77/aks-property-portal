import { Lock } from 'lucide-react';
import { BRAND_ATTRIBUTION } from '@/lib/constants';

type PortalFooterVariant = 'gateway' | 'client' | 'compact' | 'minimal';

interface PortalFooterProps {
  variant?: PortalFooterVariant;
}

const VARIANT_CONFIG: Record<
  PortalFooterVariant,
  {
    footerClass: string;
    containerClass: string;
    attributionClass: string;
    showCopyright: boolean;
    showConfidentiality: boolean;
  }
> = {
  gateway: {
    footerClass: 'border-t border-slate-800/80 bg-slate-900 py-8 text-center text-xs text-slate-500',
    containerClass: 'max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4',
    attributionClass: 'font-semibold text-slate-300 tracking-wide',
    showCopyright: true,
    showConfidentiality: true,
  },
  client: {
    footerClass:
      'border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#121215]/80 py-6 text-xs text-slate-500 dark:text-zinc-400',
    containerClass: 'max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3',
    attributionClass: 'font-semibold text-slate-700 dark:text-zinc-200 tracking-wide',
    showCopyright: true,
    showConfidentiality: true,
  },
  compact: {
    footerClass: 'mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400',
    containerClass: 'flex flex-col sm:flex-row items-center justify-between gap-2',
    attributionClass: 'font-semibold text-slate-700 dark:text-slate-300',
    showCopyright: true,
    showConfidentiality: false,
  },
  minimal: {
    footerClass: 'mt-4 text-center text-[11px] text-slate-500 dark:text-slate-400',
    containerClass: 'flex justify-center',
    attributionClass: 'font-semibold tracking-wide',
    showCopyright: false,
    showConfidentiality: false,
  },
};

/**
 * Shared portal footer displaying copyright, confidentiality notice, and parent brand attribution.
 */
export function PortalFooter({ variant = 'gateway' }: PortalFooterProps) {
  const cfg = VARIANT_CONFIG[variant];

  return (
    <footer className={cfg.footerClass}>
      <div className={cfg.containerClass}>
        {cfg.showCopyright ? (
          <div className="text-center sm:text-left space-y-1">
            <p>© {new Date().getFullYear()} AKS Property Checklist. All Rights Reserved.</p>
            <p className={cfg.attributionClass}>{BRAND_ATTRIBUTION}</p>
          </div>
        ) : (
          <p className={cfg.attributionClass}>{BRAND_ATTRIBUTION}</p>
        )}

        {cfg.showConfidentiality && (
          <p className="flex items-center gap-1.5 justify-center">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            Protected by Advocate-Client Confidentiality Privileges
          </p>
        )}
      </div>
    </footer>
  );
}
