"use client";
// Cliente de Better Auth para componentes de cliente.
import { createAuthClient } from "better-auth/react";
import { magicLinkClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), organizationClient()],
});

export const { useSession, signOut } = authClient;
