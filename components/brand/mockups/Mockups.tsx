"use client";
// The brand in the places it will live, drawn from its own values, live: change a colour or the mark and every
// mockup follows. Each one is whole inside its tile (sized to the tile, never cropped), the platforms' chrome is
// plain shapes, and words only sit on a real picture behind a scrim, or on the brand's own colour.
import type { CSSProperties, ReactNode } from "react";
import { inkOn } from "@/lib/brand-values";

export interface MockBrand {
  name: string; handle: string; domain: string; tagline: string; bio: string; postLine: string;
  /** The mark, the mark for dark grounds, and a real picture (never a site's screenshot) */
  mark: string | null; markOnDark: string | null; hero: string | null;
  paper: string; ink: string; accent: string; brand: string;
  display: string; text: string;
  labels: { follow: string; followers: string; following: string; likes: string };
}

const isDark = (hex: string) => inkOn(hex) !== "#101216";

/** The mark on a ground, or the brand's initial set in its display face. `size` is a CSS length */
function Icon({ b, bg, size, radius }: { b: MockBrand; bg: string; size: string; radius: string }) {
  const dark = isDark(bg);
  const src = dark ? b.markOnDark ?? b.mark : b.mark ?? b.markOnDark;
  // A mark drawn for the other ground, as a flat silhouette in this ground's ink
  const filter = src && dark && !b.markOnDark ? "brightness(0) invert(1)" : src && !dark && !b.mark ? "brightness(0)" : undefined;
  // The logo file stands on its own, centred and as large as the icon: it brings its own shape and ground.
  // Without one, the initial is set on the brand's ground
  if (src) return <span className="mk-icon mk-icon--file" style={{ width: size, height: size }}><img src={src} alt="" style={{ filter }} draggable={false} /></span>;
  return (
    <span className="mk-icon" style={{ width: size, height: size, borderRadius: radius, background: bg, color: inkOn(bg), fontFamily: b.display }}>
      <b style={{ fontSize: `calc(${size} * 0.5)` }}>{b.name.slice(0, 1).toUpperCase()}</b>
    </span>
  );
}

/** A picture with a scrim, or the brand's colour: what words can sit on */
function Ground({ b, children, className = "", scrim = "bottom" }: { b: MockBrand; children?: ReactNode; className?: string; scrim?: "bottom" | "full" }) {
  return (
    <div className={`mk-ground ${className}`} style={{ background: b.hero ? "#111" : b.brand, color: b.hero ? "#fff" : inkOn(b.brand) }}>
      {b.hero && <><img src={b.hero} alt="" draggable={false} /><i className={`mk-scrim mk-scrim--${scrim}`} /></>}
      {children}
    </div>
  );
}

const Phone = ({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) => (
  <div className={`mk-phone ${className}`}><div className="mk-phone__screen" style={style}>{children}</div><i className="mk-phone__island" /></div>
);

const handleOf = (b: MockBrand) => b.handle || b.name.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function XProfile({ b }: { b: MockBrand }) {
  return (
    <div className="mk-x" style={{ fontFamily: b.text }}>
      <Ground b={b} className="mk-x__banner" scrim="full">
        {!b.hero && b.postLine && <span style={{ fontFamily: b.display }}>{b.postLine}</span>}
      </Ground>
      <div className="mk-x__body">
        <div className="mk-x__row">
          <span className="mk-x__avatar"><Icon b={b} bg={b.paper} size="13cqi" radius="50%" /></span>
          <span className="mk-x__follow">{b.labels.follow}</span>
        </div>
        <b className="mk-x__name">{b.name}</b>
        <span className="mk-x__handle">@{handleOf(b)}</span>
        {(b.bio || b.tagline) && <p className="mk-x__bio">{b.bio || b.tagline}</p>}
        {b.domain && <span className="mk-x__link" style={{ color: isDark(b.accent) || b.accent.startsWith("var") ? b.accent : "#1D9BF0" }}>{b.domain}</span>}
      </div>
    </div>
  );
}

export function IGStory({ b }: { b: MockBrand }) {
  return (
    <Phone className="mk-story">
      <Ground b={b} className="mk-story__ground">
        <div className="mk-story__bars"><i className="is-done" /><i className="is-on" /><i /></div>
        <div className="mk-story__who"><Icon b={b} bg={b.paper} size="4cqi" radius="50%" /><span style={{ fontFamily: b.text }}>{handleOf(b)}</span></div>
        <div className="mk-story__words">
          <p className="mk-story__line" style={{ fontFamily: b.display }}>{b.postLine || b.tagline || b.name}</p>
          {b.tagline && b.postLine && <p className="mk-story__sub" style={{ fontFamily: b.text }}>{b.tagline}</p>}
        </div>
      </Ground>
    </Phone>
  );
}

export function IGPost({ b }: { b: MockBrand }) {
  return (
    <Phone className="mk-post">
      <div className="mk-post__head" style={{ fontFamily: b.text }}><Icon b={b} bg={b.ink} size="3.6cqi" radius="50%" /><span>{handleOf(b)}</span><i>···</i></div>
      <Ground b={b} className="mk-post__img" scrim="full">
        <p style={{ fontFamily: b.display }}>{b.postLine || b.tagline || b.name}</p>
      </Ground>
      <div className="mk-post__actions"><i /><i /><i /><i className="mk-post__save" /></div>
      <p className="mk-post__text" style={{ fontFamily: b.text }}><b>2,418 {b.labels.likes}</b></p>
      {(b.bio || b.tagline) && <p className="mk-post__text" style={{ fontFamily: b.text }}><b>{handleOf(b)}</b> {b.bio || b.tagline}</p>}
    </Phone>
  );
}

export function BrowserTab({ b }: { b: MockBrand }) {
  const domain = b.domain || `${handleOf(b)}.com`;
  return (
    <div className="mk-browser">
      <div className="mk-browser__top">
        <span className="mk-dots"><i /><i /><i /></span>
        <span className="mk-browser__tab"><Icon b={b} bg={b.paper} size="3.4cqi" radius="0.8cqi" /><span style={{ fontFamily: b.text }}>{b.name}</span></span>
      </div>
      <div className="mk-browser__bar"><span>←</span><span className="is-off">→</span><span>↻</span><span className="mk-browser__url">{domain}</span></div>
      <div className="mk-browser__page" style={{ background: b.paper, color: b.ink }}>
        <div className="mk-browser__nav" style={{ fontFamily: b.text }}><Icon b={b} bg={b.paper} size="3cqi" radius="0.6cqi" /><b>{b.name}</b></div>
        <p className="mk-browser__headline" style={{ fontFamily: b.display }}>{b.postLine || b.tagline || b.name}</p>
        <span className="mk-browser__cta" style={{ background: b.accent, color: b.accent.startsWith("#") ? inkOn(b.accent) : b.paper, fontFamily: b.text }}>{b.labels.follow}</span>
      </div>
    </div>
  );
}

export function MacDock({ b }: { b: MockBrand }) {
  return (
    <div className="mk-dock">
      <div className="mk-dock__bar">
        <span className="mk-dock__app" /><span className="mk-dock__app" />
        <span className="mk-dock__brand"><Icon b={b} bg={b.paper} size="12cqi" radius="22.5%" /><i className="mk-dock__dot" /></span>
        <span className="mk-dock__app" /><span className="mk-dock__app" />
      </div>
    </div>
  );
}

export function IPhoneHome({ b }: { b: MockBrand }) {
  const ground = isDark(b.ink) ? b.ink : "#15161A";
  return (
    <Phone className="mk-home" style={{ background: `linear-gradient(160deg, ${ground}, color-mix(in srgb, ${b.brand} 45%, ${ground}))` }}>
      <div className="mk-home__grid">
        {Array.from({ length: 16 }).map((_, i) => (i === 0
          ? <span key={i} className="mk-home__cell"><Icon b={b} bg={b.paper} size="100%" radius="22.5%" /><small style={{ fontFamily: b.text }}>{b.name}</small></span>
          : <span key={i} className="mk-home__cell"><i /><small /></span>))}
      </div>
      <div className="mk-home__dock">{[0, 1, 2, 3].map((i) => <i key={i} />)}</div>
    </Phone>
  );
}
