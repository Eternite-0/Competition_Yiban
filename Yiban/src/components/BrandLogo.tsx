import logoMark from '../assets/brand/brand-mark.svg';

type BrandLogoProps = {
  /** full 保留兼容，当前统一使用可缩放的品牌图形标 */
  variant?: 'mark' | 'full';
  size?: number;
  className?: string;
  /** 是否显示文字「易赛通」 */
  withWordmark?: boolean;
  wordmarkClassName?: string;
  subtitle?: string;
};

/**
 * 易赛通品牌标识 — 侧栏 / 登录 / 顶栏共用。
 */
export default function BrandLogo({
  variant = 'mark',
  size = 32,
  className = '',
  withWordmark = false,
  wordmarkClassName = '',
  subtitle,
}: BrandLogoProps) {
  const src = logoMark;

  return (
    <div data-brand-variant={variant} className={`flex items-center gap-2.5 min-w-0 ${className}`.trim()}>
      <img
        src={src}
        alt="易赛通"
        width={size}
        height={size}
        className="brand-logo-mark shrink-0"
        style={{ width: size, height: size }}
        draggable={false}
      />
      {withWordmark ? (
        <div className="min-w-0 flex flex-col leading-tight">
          <span className={`brand-wordmark truncate text-[16px] font-semibold tracking-tight text-ink ${wordmarkClassName}`.trim()}>
            易赛通
          </span>
          {subtitle ? (
            <span className="truncate text-[11px] text-placeholder">{subtitle}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
