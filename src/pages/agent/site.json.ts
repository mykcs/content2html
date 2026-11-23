import { agentCatalog } from '../../lib/agent-reader';
export const prerender = true;
export const GET = async () => new Response(JSON.stringify(await agentCatalog(), null, 2) + '\n', {
  headers: {'Content-Type':'application/json; charset=utf-8'},
});
