"use client";

import { useState } from "react";

const gradients = [
  "from-clay-500 via-[#d98b4f] to-[#f1c27d]",
  "from-lagoon-700 via-lagoon-600 to-[#7cc4b8]",
  "from-[#6b3f69] via-[#a3577b] to-[#e9a48a]",
  "from-[#35524a] via-[#5f8a65] to-[#c7d59f]",
  "from-[#3a4a7a] via-[#5d72b0] to-[#a8c0e8]",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Photo with a warm gradient fallback. Uses a plain <img> because Phase 1
 * placeholder photography comes from a remote CDN that may be unavailable.
 */
export function Photo({
  src,
  alt,
  label,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  label?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const g = gradients[hash(label ?? alt) % gradients.length];
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${g} ${className}`}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          ref={(el) => {
            // The image may have failed before hydration attached onError.
            if (el && el.complete && el.naturalWidth === 0) setFailed(true);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {failed && (
        <div role="img" aria-label={alt} className="absolute inset-0 flex items-end p-4">
          {label && <span className="h-display text-2xl font-semibold text-white/90 drop-shadow">{label}</span>}
        </div>
      )}
    </div>
  );
}
