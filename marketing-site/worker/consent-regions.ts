// Where the law asks before a cookie that is not strictly necessary: the EU, the rest of the EEA, the UK and
// Switzerland, with the territories Cloudflare names by a code of their own
const ASK_FIRST = new Set((
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE " +
  "IS LI NO GB CH " +
  "AX GF GP MF MQ RE YT GI GG IM JE"
).split(" "));

/** A country that cannot be named (none, XX, or T1 for Tor) is asked too */
export const asksFirst = (country: string | null | undefined): boolean => !country || country === "XX" || country === "T1" || ASK_FIRST.has(country);
