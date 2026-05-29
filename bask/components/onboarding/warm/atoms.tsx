'use client';

import React from 'react';
import { CITATIONS, CitationId } from '../../../lib/onboarding/citations';
import { BackIcon, CheckIcon, SparkleIcon } from './icons';

// Sunny palette tokens (mirror tailwind.config.ts).
export const WARM = {
  bg: '#FBF6EB',
  card: '#FFFFFF',
  ink: '#2A2419',
  mute: '#7A6E58',
  sun: '#FFC93C',
  sunDeep: '#F4A536',
  accent: '#FF8A66',
  good: '#5BB47A',
} as const;

// ── Background: warm cream + top sun-glow ──
export function WarmBackground({
  variant = 'default',
}: {
  variant?: 'default' | 'hero';
}) {
  const glow =
    variant === 'hero'
      ? `radial-gradient(120% 64% at 50% -14%, ${WARM.sun}59 0%, ${WARM.sun}1f 28%, ${WARM.bg} 52%)`
      : `radial-gradient(120% 60% at 50% -18%, ${WARM.sun}33 0%, ${WARM.bg} 46%)`;
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ background: WARM.bg }}
    >
      <div className="absolute inset-0" style={{ background: glow }} />
    </div>
  );
}

// ── Progress top bar + back button ──
export function WarmTopBar({
  frac,
  onBack,
  show,
}: {
  frac: number;
  onBack?: () => void;
  show?: boolean;
}) {
  return (
    <div
      style={{
        padding: '0 22px',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        className="bask-button"
        onClick={onBack}
        aria-label="Go back"
        style={{
          appearance: 'none',
          border: 0,
          cursor: onBack ? 'pointer' : 'default',
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(40,30,10,0.10)',
          opacity: onBack ? 1 : 0,
        }}
      >
        <BackIcon color={WARM.ink} />
      </button>
      {show && (
        <div
          style={{
            flex: 1,
            height: 7,
            borderRadius: 99,
            background: 'rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.max(0.04, frac) * 100}%`,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${WARM.sun}, ${WARM.sunDeep}, ${WARM.accent})`,
              transition: 'width 0.6s cubic-bezier(.3,1,.4,1)',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Content scroll body + pinned footer ──
export function WarmBody({
  children,
  footer,
  center,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '6px 26px 8px',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: center ? 'center' : 'flex-start',
        }}
      >
        {children}
      </div>
      {footer && <div style={{ padding: '8px 22px 30px', flexShrink: 0 }}>{footer}</div>}
    </div>
  );
}

// ── Typography ──
export function WarmHeadline({
  children,
  size = 31,
  className = '',
}: {
  children: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <h1
      className={className}
      style={{
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: '-0.025em',
        color: WARM.ink,
        margin: 0,
        textWrap: 'balance',
      }}
    >
      {children}
    </h1>
  );
}

export function WarmSub({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontWeight: 700,
        fontSize: 15.5,
        lineHeight: 1.4,
        color: WARM.mute,
        margin: '10px 0 0',
        textWrap: 'pretty',
      }}
    >
      {children}
    </p>
  );
}

export function WarmEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: WARM.mute,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

// ── Buttons ──
export function WarmCTA({
  children,
  onClick,
  icon,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="bask-button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        appearance: 'none',
        border: 0,
        cursor: disabled ? 'default' : 'pointer',
        width: '100%',
        borderRadius: 999,
        padding: '19px 24px',
        background: disabled
          ? 'rgba(0,0,0,0.10)'
          : `linear-gradient(135deg, ${WARM.sun} 0%, ${WARM.sunDeep} 100%)`,
        color: disabled ? 'rgba(0,0,0,0.32)' : WARM.ink,
        fontWeight: 900,
        fontSize: 18,
        letterSpacing: '-0.01em',
        boxShadow: disabled
          ? 'none'
          : `0 12px 26px ${WARM.sunDeep}55, 0 0 0 1px rgba(255,255,255,0.4) inset`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function WarmGhost({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="bask-button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        appearance: 'none',
        border: 0,
        background: 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        width: '100%',
        padding: '14px 0 2px',
        marginTop: 4,
        fontWeight: 800,
        fontSize: 15,
        color: WARM.mute,
      }}
    >
      {children}
    </button>
  );
}

// ── Selectable option row ──
export function WarmOption({
  icon,
  label,
  sub,
  selected,
  multi,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  sub?: string;
  selected: boolean;
  multi?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="bask-button"
      onClick={onClick}
      style={{
        appearance: 'none',
        border: 0,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '15px 16px',
        borderRadius: 20,
        background: WARM.card,
        boxShadow: selected
          ? `0 0 0 2.5px ${WARM.good}, 0 10px 24px rgba(40,30,10,0.10)`
          : '0 4px 16px rgba(40,30,10,0.06)',
        transition: 'box-shadow .2s, transform .12s',
      }}
    >
      {icon && <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: WARM.ink }}>{label}</div>
        {sub && (
          <div style={{ fontWeight: 700, fontSize: 12.5, color: WARM.mute, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: multi ? 8 : 13,
          flexShrink: 0,
          background: selected ? WARM.good : 'transparent',
          border: selected ? 'none' : `2px solid ${WARM.ink}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background .15s',
        }}
      >
        {selected && (
          <span className="check-animation" style={{ display: 'flex' }}>
            <CheckIcon color="#fff" size={15} />
          </span>
        )}
      </span>
    </button>
  );
}

// ── Skin / color swatch card ──
export function WarmSwatchCard({
  color,
  title,
  sub,
  selected,
  onClick,
}: {
  color: string;
  title: string;
  sub?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="bask-button"
      onClick={onClick}
      style={{
        appearance: 'none',
        border: 0,
        cursor: 'pointer',
        padding: '13px 6px 11px',
        borderRadius: 20,
        background: WARM.card,
        position: 'relative',
        boxShadow: selected
          ? `0 0 0 2.5px ${WARM.good}, 0 8px 20px rgba(40,30,10,0.10)`
          : '0 4px 14px rgba(40,30,10,0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'box-shadow .2s, transform .12s',
      }}
    >
      {selected && (
        <span
          className="check-animation"
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 20,
            height: 20,
            borderRadius: 10,
            background: WARM.good,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckIcon color="#fff" size={12} strokeWidth={3} />
        </span>
      )}
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: color,
          boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.08)',
        }}
      />
      <span style={{ fontWeight: 900, fontSize: 14, color: WARM.ink }}>{title}</span>
      {sub && (
        <span
          style={{
            fontWeight: 700,
            fontSize: 9.5,
            lineHeight: 1.15,
            color: WARM.mute,
            textAlign: 'center',
          }}
        >
          {sub}
        </span>
      )}
    </button>
  );
}

// ── Citation card ──
export function WarmCite({
  id,
  claim,
  source,
}: {
  id?: CitationId;
  claim?: string;
  source?: string;
}) {
  const c = id ? CITATIONS[id] : { claim: claim ?? '', source: source ?? '' };
  return (
    <div
      style={{
        background: WARM.sun + '24',
        borderRadius: 18,
        padding: '14px 16px',
        display: 'flex',
        gap: 11,
        alignItems: 'center',
      }}
    >
      <span style={{ flexShrink: 0 }}>
        <SparkleIcon color={WARM.sunDeep} size={16} />
      </span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.45, color: WARM.ink }}>
          {c.claim}
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 11,
            color: WARM.sunDeep,
            marginTop: 6,
            letterSpacing: '0.02em',
          }}
        >
          {c.source}
        </div>
      </div>
    </div>
  );
}

// ── Haloed permission glyph ──
export function WarmPermissionGlyph({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 116,
        height: 116,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="mascot-halo-pulse"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${WARM.sun}66, transparent 70%)`,
        }}
      />
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 30px rgba(40,30,10,0.14)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Numbered info card (disclaimer) ──
export function WarmInfoCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 24,
        padding: '20px 20px 8px',
        boxShadow: '0 6px 20px rgba(40,30,10,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: `2px solid ${WARM.sunDeep}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: WARM.sunDeep,
          }}
        >
          {icon}
        </div>
        <div style={{ fontWeight: 900, fontSize: 18, color: WARM.ink, letterSpacing: '-0.01em' }}>
          {title}
        </div>
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 13,
            padding: '12px 0',
            borderTop: i ? `1px solid ${WARM.ink}0f` : '1px solid transparent',
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: 24,
              height: 24,
              borderRadius: 12,
              border: `1.6px solid ${WARM.sunDeep}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 12,
              color: WARM.sunDeep,
            }}
          >
            {i + 1}
          </span>
          <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.42, color: WARM.ink + 'cc' }}>
            {it}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Labeled numeric input card (age / weight) ──
export function WarmInputCard({
  label,
  placeholder,
  value,
  onChange,
  unitToggle,
  unit,
  onUnit,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  unitToggle?: string[];
  unit?: string;
  onUnit?: (u: string) => void;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 22,
        padding: '16px 18px',
        boxShadow: '0 4px 16px rgba(40,30,10,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: WARM.mute }}>{label}</span>
        {unitToggle && onUnit && (
          <div
            style={{
              display: 'flex',
              gap: 2,
              background: WARM.ink + '0d',
              borderRadius: 999,
              padding: 3,
            }}
          >
            {unitToggle.map((u) => (
              <button
                key={u}
                type="button"
                className="bask-button"
                onClick={() => onUnit(u)}
                style={{
                  appearance: 'none',
                  border: 0,
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: unit === u ? '#fff' : 'transparent',
                  color: unit === u ? WARM.sunDeep : WARM.mute,
                  fontWeight: 800,
                  fontSize: 12.5,
                  boxShadow: unit === u ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {u}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        inputMode="numeric"
        placeholder={placeholder}
        style={{
          appearance: 'none',
          border: 0,
          outline: 'none',
          background: 'transparent',
          width: '100%',
          marginTop: 6,
          fontWeight: 800,
          fontSize: 24,
          color: WARM.ink,
          letterSpacing: '-0.01em',
        }}
      />
    </div>
  );
}

// ── Mascot speech bubble ("Did you know?") ──
export function WarmSpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="warm-bubble-in"
      style={{
        position: 'relative',
        maxWidth: 300,
        background: '#fff',
        borderRadius: 26,
        padding: 22,
        boxShadow: '0 14px 36px rgba(40,30,10,0.12)',
      }}
    >
      {children}
      <span
        style={{
          position: 'absolute',
          left: 40,
          bottom: -11,
          width: 22,
          height: 22,
          background: '#fff',
          transform: 'rotate(45deg)',
          borderBottomRightRadius: 6,
        }}
      />
    </div>
  );
}
