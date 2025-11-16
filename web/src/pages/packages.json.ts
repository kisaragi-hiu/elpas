import type { APIRoute } from "astro";
import { packages } from "$data/data.ts";
export const GET: APIRoute = async ({ params }) => {
  return new Response(JSON.stringify(packages));
};
