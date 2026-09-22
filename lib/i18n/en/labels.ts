// Etiquetas de valores que se guardan en la base de datos en castellano.
//
// Son códigos que resultan ser palabras castellanas: inspo_item.tipo, el "Ambos"
// heredado del sheet, las zonas del panel de actividad, las secciones del DESIGN.md.
// No se traducen en la base de datos (sería una migración con riesgo y sin ganancia:
// normalizeTipo convierte en "Inspiración" cualquier valor que no reconozca). Se
// traducen aquí, solo al enseñarlos.
export const labels = {
  /** inspo_item.tipo */
  tipo: {
    "Inspiración": "Inspiration",
    Videos: "Videos",
    Ideas: "Ideas",
    Documentales: "Documentaries",
  },
  /** Filtro de fecha; el valor del estado sigue siendo la cadena castellana */
  fecha: {
    Todos: "All",
    "Este mes": "This month",
    "Este año": "This year",
  },
  /** "Ambos" es el autor heredado del sheet: no es una persona, es "no se sabe quién" */
  autor: {
    Todos: "All",
    Ambos: "Both",
  },
  /** activity_segment.area */
  area: {
    biblioteca: "Library",
    busqueda: "AI search",
    "design-md": "DESIGN.md",
    comentarios: "Comments",
    recursos: "Directory",
    anadir: "Add inspo",
    equipo: "Team",
    planes: "Plans",
    admin: "Activity",
    invitacion: "Invitation",
  },
  /** ai_usage.action */
  action: {
    design_md: "DESIGN.md generated",
    vision: "Screenshots described",
    jev_tag: "Inspos tagged",
    jev_search: "AI searches",
    jev_recursos: "Directory searches",
    explain: "Search explanations",
    revise: "DESIGN.md revisions",
  },
};
