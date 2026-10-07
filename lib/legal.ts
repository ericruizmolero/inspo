// Who answers for the service, for the legal pages (/privacy and /terms, text in lib/i18n/<locale>/legal.ts).
// Until the company's details are filled in here the pages are a draft: they show in development, answer 404
// in production, and nothing links to them.

export interface LegalFacts {
  /** Registered name of the company that runs criterio.design */
  entity: string;
  /** Its tax number (NIF) */
  taxId: string;
  /** Its registered address */
  address: string;
  /** Where people write about their data, the terms, or something to take down */
  contact: string;
}

export const LEGAL: LegalFacts = {
  entity: "",
  taxId: "",
  address: "",
  contact: "hola@criterio.design",
};

/** The day the texts last changed (YYYY-MM-DD): change it with them */
export const LEGAL_UPDATED = "2026-10-06";

/** Every detail the texts name is in */
export const legalReady = () => !!(LEGAL.entity && LEGAL.taxId && LEGAL.address);

/** Whether the pages answer and the app links to them */
export const legalShown = () => legalReady() || process.env.NODE_ENV !== "production";
