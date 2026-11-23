import { llmsText } from '../lib/agent-reader';
export const prerender = true;
export const GET = async () => new Response(await llmsText(), {
  headers: {'Content-Type':'text/plain; charset=utf-8'},
});
