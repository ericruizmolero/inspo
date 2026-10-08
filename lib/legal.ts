// Who answers for the service, for the legal pages (/privacy and /terms, text in lib/i18n/<locale>/legal.ts).
// Until the company's details are filled in here the pages are a draft: they answer everywhere with the pending
// facts named as such and a draft notice, and the sign-in form links to them (Eric, 2026-10-07: they must be there).

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

/** Whether the pages answer and the app links to them: always, draft or not */
export const legalShown = () => true;
