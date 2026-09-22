"use client";
// Cliente de Better Auth para componentes de cliente.
import { createAuthClient } from "better-auth/react";
import { magicLinkClient, organizationClient, lastLoginMethodClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), organizationClient(), lastLoginMethodClient()],
});

export const { useSession, signOut } = authClient;
