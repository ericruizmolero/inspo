export interface InspoItem {
  empresa: string;
  web: string;
  fecha: string;
  puestoPor: "Eric" | "Andoni" | "Ambos";
  tipo: "Inspiración" | "Videos" | "Ideas" | "Documentales";
  comentarios: string;
  subcomentarios?: string;
}

export type FilterTipo = "Todos" | InspoItem["tipo"];
export type FilterAutor = "Todos" | InspoItem["puestoPor"];
