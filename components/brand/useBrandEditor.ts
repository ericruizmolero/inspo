"use client";
// Saving the brand from the presentation. A change shows at once (an overlay over what the server has); saves go out
// in order, each with when its section was last written as this tab knows it. If someone else wrote it since, their
// version comes back and is shown, with a word about it, instead of being overwritten.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emptyBrand, type BrandSection, type BrandSections, type BrandSpec } from "@/types/brand";
import type { ProjectSystem } from "@/types/system";
import { saveBrand, releaseBrand } from "@/app/actions/brand";

export function useBrandEditor(projectId: string, system: ProjectSystem, onSystem: (s: ProjectSystem) => void, onNotice: (msg: string) => void, movedText: string) {
  const [overlay, setOverlay] = useState<Partial<BrandSections>>({});
  const [saving, setSaving] = useState<ReadonlySet<BrandSection>>(() => new Set());
  // The brand as the server last said it: the base every save is sent against
  const known = useRef<BrandSpec>(system.brand ?? emptyBrand());
  const inFlight = useRef(0);
  useEffect(() => { if (!inFlight.current) known.current = system.brand ?? emptyBrand(); }, [system]);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const brand = useMemo(() => ({ ...(system.brand ?? emptyBrand()), ...overlay }) as BrandSpec, [system, overlay]);

  const save = useCallback(<K extends BrandSection>(section: K, value: BrandSections[K]) => {
    setOverlay((o) => ({ ...o, [section]: value }));
    setSaving((s) => new Set([...s, section]));
    inFlight.current++;
    chain.current = chain.current.then(async () => {
      const baseAt = known.current.meta[section]?.at ?? null;
      const r = await saveBrand(projectId, section, value, baseAt).catch((e) => ({ ok: false as const, error: String(e) }));
      inFlight.current--;
      if (r.ok) known.current = r.data.system.brand ?? emptyBrand();
      // The overlay of this section goes once nothing newer for it is waiting
      setOverlay((o) => (o[section] === value ? (({ [section]: _, ...rest }) => rest)(o) as Partial<BrandSections> : o));
      setSaving((s) => { const n = new Set(s); n.delete(section); return n; });
      if (!r.ok) { onNotice(r.error); return; }
      if (r.data.conflict) { setOverlay((o) => (({ [section]: _, ...rest }) => rest)(o) as Partial<BrandSections>); onNotice(movedText); }
      onSystem(r.data.system);
    });
  }, [projectId, onSystem, onNotice, movedText]);

  const release = useCallback((section: BrandSection) => {
    void releaseBrand(projectId, section).then((r) => { if (r.ok) { known.current = r.data.brand ?? emptyBrand(); onSystem(r.data); } else onNotice(r.error); });
  }, [projectId, onSystem, onNotice]);

  return { brand, save, release, saving };
}
