"use client";
// What every part of the presentation reads: the brand, the project around it, how its files and faces load, and,
// in the app, how a section is saved. On a share link the same parts render read only.
import { createContext, useContext } from "react";
import type { BrandFile, BrandSection, BrandSections, BrandSpec } from "@/types/brand";
import type { SystemAreaState } from "@/types/system";

/** A reference of the project, as the presentation shows it */
export interface BrandRef { id: string; name: string; web: string; image: string | null; /** web, image, video, post, text (lib/url.ts mediaKindOf) */ kind?: string }
export interface FoundFace { family: string; source: "google" | "fontshare" | "site" | "upload" | "system"; slug?: string; siteWeb?: string; weights: number[] }
export type UploadPurpose = "logo" | "font" | "image" | "file";

export interface BrandCtxValue {
  spec: BrandSpec;
  /** The project's (the brand's) name */
  name: string;
  summary: string;
  areas: SystemAreaState[];
  mode: "edit" | "view";
  /** Where a stored file loads from: the app's files route, or the share's */
  fileSrc: (key: string) => string;
  /** The project's references by id */
  refs: Record<string, BrandRef>;
  /** A face's CSS stack, by face id; the display and text stacks of the page */
  stack: (faceId: string | undefined) => string;
  display: string;
  text: string;
  /** The accent the page marks with, already readable on the paper */
  accent: string;
  /** criterio.md as this viewer gets it (the whole file in the app, the link's on a share) */
  markdown: string;
  /** Everything in one zip, when it can be had */
  zipHref?: string;
  /** Edit mode only */
  save: <K extends BrandSection>(section: K, value: BrandSections[K]) => void;
  release: (section: BrandSection) => void;
  upload?: (file: File, purpose: UploadPurpose) => Promise<BrandFile>;
  findFace?: (family: string) => Promise<FoundFace | null>;
  saving: ReadonlySet<BrandSection>;
}

export const BrandCtx = createContext<BrandCtxValue | null>(null);
export function useBrand(): BrandCtxValue {
  const v = useContext(BrandCtx);
  if (!v) throw new Error("useBrand outside BrandPresentation");
  return v;
}
