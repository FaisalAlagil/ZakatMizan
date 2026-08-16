import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Review was merged into the income page.
    return [{ source: '/review', destination: '/income', permanent: false }]
  },
  /* config options here */
};

export default nextConfig;
