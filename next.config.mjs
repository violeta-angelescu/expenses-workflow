/** @type {import('next').NextConfig} */
export default {
  output: "standalone",
  // Lets the Playwright server run next to a `next dev` of the same checkout.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};
