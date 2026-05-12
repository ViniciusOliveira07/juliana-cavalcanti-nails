import React from "react";

export function Spinner() {
  return (
    <div className="flex h-8 w-8 items-center justify-center">
      <svg
        className="h-6 w-6 animate-spin text-brand-wine"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
        <path
          className="opacity-75"
          d="M4 12a8 8 0 018-8"
          strokeWidth="4"
        />
      </svg>
    </div>
  );
}
