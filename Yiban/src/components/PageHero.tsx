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
  const titleSize = density === 'feature'
    ? 'text-[30px] sm:text-[36px] leading-[1.08]'
    : 'text-[26px] sm:text-[30px] leading-[1.12]';

  return (
    <header
      data-density={density}
      data-surface={surface}
      className={`page-hero ${className}`.trim()}
    >
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <div className={`min-w-0 ${contentClassName}`.trim()}>
          {prefix}
          {eyebrow ? (
            <span className="text-[11px] font-semibold uppercase text-ink-muted-48">
              {eyebrow}
            </span>
          ) : null}
          <h1 className={`mt-1 font-display font-semibold text-ink ${titleSize} ${titleClassName}`.trim()}>
            {title}
          </h1>
          {description ? (
            <p className={`mt-1.5 max-w-3xl text-[14px] text-ink-muted-80 sm:text-[15px] ${descriptionClassName}`.trim()}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
