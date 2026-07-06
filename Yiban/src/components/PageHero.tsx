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
  const titleSize = 'text-[26px] leading-[1.3] tracking-tight';

  return (
    <header
      data-density={density}
      data-surface={surface}
      className={`page-hero ${className}`.trim()}
    >
      <div className="flex flex-col gap-lg sm:flex-row sm:items-center sm:justify-between">
        <div className={`min-w-0 ${contentClassName}`.trim()}>
          {prefix}
          {eyebrow ? (
            <span className="text-[12px] font-medium tracking-[0.08em] text-placeholder">
              {eyebrow}
            </span>
          ) : null}
          <h1 className={`mt-1.5 mb-2 font-display font-medium text-ink ${titleSize} ${titleClassName}`.trim()}>
            {title}
          </h1>
          {description ? (
            <p className={`max-w-3xl text-[14px] font-normal leading-[1.65] text-body-subtle ${descriptionClassName}`.trim()}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
