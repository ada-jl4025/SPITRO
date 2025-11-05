"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Contrast, Type } from "lucide-react";

type TextScale = "standard" | "large" | "xlarge";

const TEXT_SCALE_KEY = "spitro-ui-text-scale";
const CONTRAST_KEY = "spitro-ui-contrast";

const TEXT_SCALE_OPTIONS: Array<{
  value: TextScale;
  label: string;
  description: string;
}> = [
  { value: "standard", label: "Standard", description: "Balanced" },
  { value: "large", label: "Large", description: "Easier to read" },
  { value: "xlarge", label: "Extra Large", description: "Maximum size" },
];

const applyTextScale = (scale: TextScale) => {
  if (typeof window === "undefined") return;
  document.body.dataset.fontSize = scale;
  window.localStorage.setItem(TEXT_SCALE_KEY, scale);
};

const applyContrast = (isHighContrast: boolean) => {
  if (typeof window === "undefined") return;
  document.body.dataset.contrast = isHighContrast ? "high" : "standard";
  window.localStorage.setItem(CONTRAST_KEY, isHighContrast ? "high" : "standard");
};

export function AccessibilityToolbar() {
  const [textScale, setTextScale] = useState<TextScale>("standard");
  const [highContrast, setHighContrast] = useState(false);

  const textScaleOptions = useMemo(() => TEXT_SCALE_OPTIONS, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedScale = window.localStorage.getItem(TEXT_SCALE_KEY) as TextScale | null;
    const storedContrast = window.localStorage.getItem(CONTRAST_KEY);

    if (storedScale && textScaleOptions.some((option) => option.value === storedScale)) {
      setTextScale(storedScale);
      applyTextScale(storedScale);
    } else {
      applyTextScale("standard");
    }

    if (storedContrast === "high") {
      setHighContrast(true);
      applyContrast(true);
    } else {
      applyContrast(false);
    }
  }, [textScaleOptions]);

  useEffect(() => {
    applyTextScale(textScale);
  }, [textScale]);

  useEffect(() => {
    applyContrast(highContrast);
  }, [highContrast]);

  return (
    <aside
      aria-label="Accessibility preferences"
      className="flex w-full flex-col gap-4 rounded-2xl border border-border/60 bg-white/75 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 sm:flex-row sm:items-center sm:justify-end"
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-tfl-blue/10 text-tfl-blue">
            <Type className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Text Size</span>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Choose text size">
              {textScaleOptions.map((option) => {
                const isActive = option.value === textScale;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTextScale(option.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setTextScale(option.value);
                      }
                    }}
                    role="radio"
                    aria-checked={isActive}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tfl-blue focus-visible:ring-offset-2",
                      isActive
                        ? "bg-tfl-blue text-white shadow"
                        : "bg-white text-foreground shadow-sm ring-1 ring-border/70 hover:bg-muted/80"
                    )}
                  >
                    <span className="block">{option.label}</span>
                    <span className="block text-xs font-normal text-muted-foreground/80 sm:hidden">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-border sm:h-10 sm:w-px" aria-hidden="true" />

      <div className="flex items-center justify-between gap-3 sm:w-auto">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-tfl-blue/10 text-tfl-blue">
            <Contrast className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Visual Contrast
            </span>
            <span className="text-sm text-muted-foreground">Boost colours for low vision</span>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={highContrast ? "default" : "outline"}
          aria-pressed={highContrast}
          onClick={() => setHighContrast((prev) => !prev)}
          className="h-11 rounded-full px-5 text-sm font-semibold"
        >
          {highContrast ? "High contrast on" : "High contrast off"}
        </Button>
      </div>
    </aside>
  );
}

