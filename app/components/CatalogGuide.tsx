'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const CATALOG_GUIDE_VERSION = 1;

type CatalogGuideProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type GuideStep = {
  target: string;
  title: string;
  description: string;
};

const signedInSteps: GuideStep[] = [
  {
    target: 'volume-button',
    title: 'Vyberte objem a množství',
    description: 'Kliknutím na objem přidáte jeden kus. Dalším kliknutím přidáváte a červeným číslem množství snižujete.',
  },
  {
    target: 'favorite-button',
    title: 'Uložte si oblíbený produkt',
    description: 'Srdíčkem si označíte produkty, které objednáváte pravidelně.',
  },
  {
    target: 'favorites-filter',
    title: 'Oblíbené na jednom místě',
    description: 'Tímto filtrem zobrazíte pouze své oblíbené produkty a objednáte je rychleji.',
  },
  {
    target: 'order-summary',
    title: 'Zkontrolujte objednávku',
    description: 'V souhrnu nebo košíku upravíte množství, doplníte poznámku a objednávku odešlete.',
  },
];

const visitorSteps = [signedInSteps[0], signedInSteps[3]];

const isVisible = (element: Element) => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
};

export default function CatalogGuide({ open, onOpenChange }: CatalogGuideProps) {
  const { user, markCatalogGuideSeen } = useAuth();
  const steps = useMemo(() => user ? signedInSteps : visitorSteps, [user]);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const currentStep = steps[stepIndex] ?? steps[0];

  const finish = () => {
    onOpenChange(false);
    if (user) {
      void markCatalogGuideSeen(CATALOG_GUIDE_VERSION).catch((error) => {
        console.warn('[CatalogGuide] Completion could not be saved:', error);
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    const url = new URL(window.location.href);
    if (url.searchParams.has('pruvodce')) {
      url.searchParams.delete('pruvodce');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !currentStep) return;

    const updateTarget = () => {
      const element = Array.from(document.querySelectorAll(`[data-catalog-guide="${currentStep.target}"]`)).find(isVisible);
      setTargetRect(element?.getBoundingClientRect() ?? null);
    };

    const element = Array.from(document.querySelectorAll(`[data-catalog-guide="${currentStep.target}"]`)).find(isVisible);
    element?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    updateTarget();
    const timer = window.setTimeout(updateTarget, 350);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    window.setTimeout(() => cardRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [currentStep, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!open || !currentStep) return null;

  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  const cardWidth = Math.min(360, viewportWidth - 32);
  const isMobile = viewportWidth < 640;
  const cardLeft = targetRect
    ? Math.max(16, Math.min(viewportWidth - cardWidth - 16, targetRect.left + targetRect.width / 2 - cardWidth / 2))
    : Math.max(16, (viewportWidth - cardWidth) / 2);
  const cardTop = targetRect
    ? (targetRect.bottom + 244 < viewportHeight ? targetRect.bottom + 16 : Math.max(16, targetRect.top - 232))
    : Math.max(16, viewportHeight / 2 - 110);

  return (
    <div className="fixed inset-0 z-[80]" aria-live="polite">
      <div className="pointer-events-none absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />

      {targetRect && (
        <div
          className="pointer-events-none fixed z-[81] rounded-xl ring-4 ring-blue-400 ring-offset-4 ring-offset-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.08)] motion-safe:animate-pulse"
          style={{
            left: targetRect.left - 5,
            top: targetRect.top - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
          }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-guide-title"
        tabIndex={-1}
        className="pointer-events-auto fixed z-[82] rounded-2xl border border-blue-100 bg-white p-5 text-slate-900 shadow-2xl outline-none"
        style={isMobile ? { left: 16, right: 16, bottom: 16 } : { left: cardLeft, top: cardTop, width: cardWidth }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Jak objednávat · {stepIndex + 1}/{steps.length}</p>
            <h2 id="catalog-guide-title" className="mt-2 text-lg font-bold tracking-tight">{currentStep.title}</h2>
          </div>
          <button type="button" onClick={finish} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Zavřít průvodce">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">{currentStep.description}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={finish} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Přeskočit</button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button type="button" onClick={() => setStepIndex((index) => index - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4" /> Zpět
              </button>
            )}
            {stepIndex < steps.length - 1 ? (
              <button type="button" onClick={() => setStepIndex((index) => index + 1)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Další <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={finish} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Hotovo <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
