// This request's session. cache(): layout, metadata, page and getT all ask for it
// and it's only fetched once per render.
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
