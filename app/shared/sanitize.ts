/* eslint-disable @stylistic/arrow-parens */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */

export function removeAccents(str = "") {
  if (typeof str !== "string") return str;
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Nettoie récursivement tout un objet (string + nested)

export function sanitizeObject<T>(obj: T): T {
  if (obj == null) return obj;

  if (typeof obj === "string") {
    return removeAccents(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as T;
  }

  if (typeof obj === "object") {
    // obj is object but not null or array
    const cleaned: { [key: string]: unknown } = {};
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cleaned[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
      }
    }
    return cleaned as T;
  }

  return obj;
}
