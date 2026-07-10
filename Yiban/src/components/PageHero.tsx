import type { ReactNode } from 'react';

type PageHeroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  prefix?: ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  density?: 'compact' | 'feature';
  surface?: 'plain' | 'raised';
};

export default function PageHero({
  eyebrow,
  title,
  description,
  actions,
  prefix,
  className = '',
  contentClassName = '',
  titleClassName = '',
  descriptionClassName = '',
  density = 'compact',
  surface = 'plain',
}: PageHeroProps) {
  return (
    <header
      data-density={density}
      data-surface={surface}
      className={`page-hero mb-1 ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className={`min-w-0 ${contentClassName}`.trim()}>
          {prefix}
          {eyebrow ? (
            <div className="mb-1 text-[12px] font-medium tracking-wide text-placeholder">
              {eyebrow}
            </div>
          ) : null}
          <h1 className={`text-[22px] font-semibold leading-tight tracking-tight text-ink ${titleClassName}`.trim()}>
            {title}
          </h1>
          {description ? (
            <p className={`mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-body-subtle ${descriptionClassName}`.trim()}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
