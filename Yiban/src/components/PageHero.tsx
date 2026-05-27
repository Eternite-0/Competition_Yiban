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
}: PageHeroProps) {
  return (
    <header className={`page-hero ${className}`.trim()}>
      <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
        <div className={`min-w-0 ${contentClassName}`.trim()}>
          {prefix}
          {eyebrow ? (
            <span className="text-[12px] uppercase tracking-[0.18em] text-ink-muted-48">
              {eyebrow}
            </span>
          ) : null}
          <h1 className={`font-display font-semibold text-[34px] sm:text-[40px] leading-[1.05] tracking-[-0.02em] text-ink mt-2 ${titleClassName}`.trim()}>
            {title}
          </h1>
          {description ? (
            <p className={`text-[15px] sm:text-[17px] text-ink-muted-80 mt-2 ${descriptionClassName}`.trim()}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
