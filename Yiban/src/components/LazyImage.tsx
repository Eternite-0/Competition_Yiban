import { useState, useRef, useEffect } from 'react';

/* Inject shimmer keyframes once at module load */
(function injectShimmerKeyframes() {
  if (typeof document === 'undefined') return;
  const id = 'lazy-image-shimmer';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @keyframes _lazy_shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(style);
})();

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Material symbol name shown when image is missing or fails to load. @default 'image' */
  fallbackIcon?: string;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  fallbackIcon = 'image',
  onError,
  ...rest
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset error/loaded when src changes (e.g. signed-url fallback)
  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [src]);

  const showFallback = !src || error;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Shimmer placeholder */}
      {!showFallback && !loaded && (
        <div className="absolute inset-0 z-10 bg-slate-100 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              animation: '_lazy_shimmer 1.5s infinite',
            }}
          />
        </div>
      )}

      {/* Fallback icon */}
      {showFallback && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <span className="material-symbols-outlined text-[40px] text-slate-400">
            {fallbackIcon}
          </span>
        </div>
      )}

      {/* Actual image */}
      {!showFallback && inView && (
        <img
          src={src as string}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            setError(true);
            onError?.(e);
          }}
          {...rest}
        />
      )}
    </div>
  );
}
