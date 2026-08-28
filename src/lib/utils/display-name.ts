// Si no hay full_name, usa la parte del correo antes de @, capitalizada.
// Se usa tanto en el saludo del dashboard como en el bloque de usuario del
// sidebar (UserMenu) — mismo criterio en los dos lugares.
export function getDisplayName(fullName: string, email: string) {
  const trimmed = fullName.trim();
  if (trimmed) return trimmed;

  const localPart = email.split("@")[0] || "";
  if (!localPart) return "";

  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}
