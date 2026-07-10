import logoMark from '../assets/brand/logo-mark.png';
import logoFull from '../assets/brand/logo.png';

type BrandLogoProps = {
  /** mark = 图标；full = 完整品牌图 */
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
  const src = variant === 'full' ? logoFull : logoMark;

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`.trim()}>
      <img
        src={src}
        alt="易赛通"
        width={size}
        height={size}
        className="shrink-0 rounded-xl object-cover ring-1 ring-black/5"
        style={{ width: size, height: size }}
        draggable={false}
      />
      {withWordmark ? (
        <div className="min-w-0 flex flex-col leading-tight">
          <span className={`truncate text-[15px] font-semibold tracking-tight text-ink ${wordmarkClassName}`.trim()}>
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
