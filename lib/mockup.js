import fs from "node:fs";
import path from "node:path";

// Map the original static-file links to Next.js routes
const linkMap = {
  "index.html": "/",
  "dashboard-a.html": "/dashboard-a",
  "dashboard-b.html": "/dashboard-b",
  "siswa.html": "/siswa",
  "input-nilai.html": "/input-nilai",
  "raport.html": "/raport",
};

/**
 * Reads a mockup HTML file at build time, pulls out its page-specific
 * <style> block and <body> markup, and rewrites internal links so the
 * markup can be injected directly into a Next.js page.
 */
export function loadMockup(file) {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "mockups", file),
    "utf8"
  );

  const style = (raw.match(/<style>([\s\S]*?)<\/style>/) || [, ""])[1];
  const body = (raw.match(/<body>([\s\S]*?)<\/body>/) || [, ""])[1];

  let html = `<style>${style}</style>${body}`;

  for (const [from, to] of Object.entries(linkMap)) {
    html = html.split(`href="${from}"`).join(`href="${to}"`);
  }

  return html;
}
