const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isBlank = (value) => !value || !String(value).trim();

export const hasMinLength = (value, min) =>
  String(value || "").trim().length >= min;

export const hasMaxLength = (value, max) =>
  String(value || "").trim().length <= max;

export const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

export const isUuid = (value) =>
  uuidRegex.test(String(value || "").trim());

export const stripHtml = (value) =>
  String(value || "").replace(/<[^>]*>/g, "").trim();

export const isDateRangeValid = (start, end) => {
  if (!start || !end) return true;
  return new Date(start).getTime() <= new Date(end).getTime();
};
