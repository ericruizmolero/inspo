// La sesión de esta petición. cache(): layout, metadata, página y getT la piden a la vez
// y solo se consulta una vez por render.
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
