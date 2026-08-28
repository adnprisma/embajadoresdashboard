// Minusculas + sin acentos, para busqueda multicampo insensible a
// mayusculas y acentos ("perez" debe encontrar "Perez" y "Perez con acento").
// \p{Mn} (Mark, Nonspacing) son los acentos combinantes que separa NFD.
export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase();
}
