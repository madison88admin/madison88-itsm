import { sanitizeHtml } from "./sanitize";

test("removes executable and unsafe HTML from stored content", () => {
  const safe = sanitizeHtml(
    '<p>Helpful text</p><img src="x" onerror="alert(1)"><script>alert(2)</script><iframe src="evil"></iframe>',
  );

  expect(safe).toContain("Helpful text");
  expect(safe).not.toContain("onerror");
  expect(safe).not.toContain("script");
  expect(safe).not.toContain("iframe");
});
