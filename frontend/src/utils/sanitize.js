import DOMPurify from "dompurify";

const SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
  FORBID_ATTR: ["style", "srcdoc"],
};

export const sanitizeHtml = (value = "") =>
  DOMPurify.sanitize(String(value), SANITIZE_OPTIONS);
