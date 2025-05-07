import type { APIRoute } from "astro";
import { combined } from "$data/data.ts"
export const GET: APIRoute = async ({ params }) => {
  return new Response(JSON.stringify(combined));
};
