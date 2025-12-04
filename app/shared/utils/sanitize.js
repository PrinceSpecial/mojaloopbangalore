/* eslint-disable @stylistic/arrow-parens */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
export function removeAccents(str = "") {
  if (typeof str !== "string") return str;
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Nettoie récursivement tout un objet (string + nested)
export function sanitizeObject(obj) {
  if (!obj) return obj;

  if (typeof obj === "string") {
    return removeAccents(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object") {
    const cleaned = {};
    for (const key in obj) {
      cleaned[key] = sanitizeObject(obj[key]);
    }
    return cleaned;
  }

  return obj;
}
