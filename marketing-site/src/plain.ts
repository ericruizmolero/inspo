/** Lowercase, without accents: "diseño" finds "diseno" and the other way round. The rows' data-text and what is typed in the search both go through it */
export const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
