"use client";

import { useEffect, useRef, useState } from "react";

const PROXY = "https://web-proxy-git-main-ericruizmoleros-projects.vercel.app/api/proxy";
const TIMEOUT_MS = 10000;

const UNPREVIEWABLE = ["x.com", "twitter.com", "youtube.com", "linkedin.com", "instagram.com", "primevideo.com"];

function isUnpreviewable(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    return UNPREVIEWABLE.some((d) => host.includes(d));
  } catch {
    return false;
  }
}

interface ProxyFrameProps {
  url: string;
  iframeWidth?: number;
  iframeHeight?: number;
  className?: string;
  onNavigate?: (url: string) => void;
  enableNav?: boolean;
}

export default function ProxyFrame({
  url,
  iframeWidth = 1440,
  iframeHeight = 900,
  className = "",
  onNavigate,
  enableNav = false,
}: ProxyFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const currentUrlRef = useRef(url);
  const syncingRef = useRef(false);

  function loadUrl(target: string) {
    const iframe = iframeRef.current;
    if (!iframe) return;

    currentUrlRef.current = target;
    setFailed(false);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    fetch(`${PROXY}?url=${encodeURIComponent(target)}`, { signal: controller.signal })
      .then((r) => r.text())
      .then((html) => {
        const patched =
          html.replace(
            "</head>",
            `<style>.w-webflow-badge,a[href*="webflow.com"]{display:none!important}</style></head>`
          );
        if (iframe) iframe.srcdoc = patched;
      })
      .catch(() => {
        setFailed(true);
      })
      .finally(() => clearTimeout(timer));
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loaded) {
          setLoaded(true);
          if (!isUnpreviewable(url)) {
            loadUrl(url);
          } else {
            setFailed(true);
          }
        }
      },
      { rootMargin: "400px 0px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (!enableNav) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    function onLoad() {
      try {
        const win = iframe!.contentWindow;
        if (!win) return;

        win.addEventListener(
          "click",
          (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest?.("a") as HTMLAnchorElement | null;
            if (!anchor) return;
            const href = anchor.getAttribute("href");
            if (!href || href === "#" || href.startsWith("#")) return;

            let abs: string;
            try {
              abs = new URL(href, currentUrlRef.current).href;
            } catch {
              return;
            }

            const domain = new URL(currentUrlRef.current).hostname;
            if (!abs.includes(domain)) return;

            e.preventDefault();
            e.stopImmediatePropagation();
            loadUrl(abs);
            onNavigate?.(abs);
          },
          true
        );

        win.addEventListener(
          "scroll",
          () => {
            if (syncingRef.current) return;
            const doc = win.document.documentElement;
            const maxScroll = doc.scrollHeight - win.innerHeight;
            if (maxScroll <= 0) return;
            window.dispatchEvent(
              new CustomEvent("proxy:scroll", {
                detail: { pct: win.scrollY / maxScroll, src: url },
              })
            );
          },
          { passive: true }
        );
      } catch {
        // cross-origin guard
      }
    }

    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableNav, url]);

  if (failed || isUnpreviewable(url)) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center bg-[#EDE8DF] text-[#C8C0B8] text-xs font-mono ${className}`}
        style={{ width: "100%", height: "100%" }}
      >
        {new URL(url).hostname.replace("www.", "")}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width: "100%", height: "100%", containerType: "inline-size" }}
    >
      <iframe
        ref={iframeRef}
        title={url}
        style={{
          border: "none",
          width: `${iframeWidth}px`,
          height: `${iframeHeight}px`,
          transform: `scale(calc(100cqi / ${iframeWidth}px))`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: enableNav ? "auto" : "none",
        }}
      />
    </div>
  );
}
