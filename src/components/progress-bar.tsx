import React from "react";

interface ProgressBarProps {
  step: number; // current step (1‑based)
  steps: string[]; // labels for each step
}

export function ProgressBar({ step, steps }: ProgressBarProps) {
  return (
    <div className="flex items-center mb-4">
      {steps.map((label, idx) => {
        const isComplete = idx + 1 < step;
        const isCurrent = idx + 1 === step;
        const circleColor = isComplete
          ? "bg-brand-wine text-brand-cream"
          : isCurrent
          ? "bg-brand-cream border border-brand-wine text-brand-wine"
          : "bg-brand-cream border border-brand-gray text-brand-gray";
        const connectorColor = isComplete ? "bg-brand-wine" : "bg-brand-gray";
        return (
          <React.Fragment key={idx}>
            <div className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${circleColor}`}
              >
                {idx + 1}
              </div>
              <span className="ml-2 text-sm font-medium text-brand-gray">
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 ${connectorColor}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
