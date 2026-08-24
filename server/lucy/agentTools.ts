import dns from "node:dns/promises";
import net from "node:net";
import type { Tool } from "../_core/llm";
import { getTavilyApiKeyForAgent } from "./credentials";

const MAX_OUTPUT = 12_000;
const MAX_SEARCH_RESULTS = 5;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 12_000;

export const SAFE_AGENT_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "public_web_lookup",
      description: "Search public web pages for current information. Use only when the user asks to find, compare, or look up something.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "A concise public-web search query." },
          limit: { type: "integer", minimum: 1, maximum: MAX_SEARCH_RESULTS, description: "Maximum number of results." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_public_url",
      description: "Read a public HTTPS web page as plain text. Use only for public URLs supplied or clearly relevant to the user’s request.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "A public HTTPS URL." },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_public_json_api",
      description: "GET a public HTTPS JSON endpoint without credentials. Never use this for private services or authenticated APIs.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "A public HTTPS JSON API URL." },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
];

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;|&#47;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function isPrivateAddress(address: string) {
  if (net.isIPv4(address)) {
    const octets = address.split(".").map(Number);
    return octets[0] === 10 || octets[0] === 127 || octets[0] === 0 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168);
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }
  return true;
}

async function validatePublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Tool URL is invalid");
  }
  if (url.protocol !== "https:") throw new Error("Only HTTPS public URLs are allowed");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname === "metadata.google.internal") throw new Error("Private or local hosts are not allowed");
  if (net.isIP(hostname) && isPrivateAddress(hostname)) throw new Error("Private IP addresses are not allowed");
  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(address => isPrivateAddress(address.address))) throw new Error("Private or unresolved hosts are not allowed");
  return url;
}

async function readLimited(response: Response) {
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > MAX_OUTPUT * 4) throw new Error("Tool response is too large");
  const reader = response.body?.getReader();
  if (!reader) return (await response.text()).slice(0, MAX_OUTPUT);
  const decoder = new TextDecoder();
  let total = 0;
  const parts: string[] = [];
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > MAX_OUTPUT * 4) {
        await reader.cancel();
        throw new Error("Tool response is too large");
      }
      parts.push(decoder.decode(next.value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("").slice(0, MAX_OUTPUT);
  } finally {
    reader.releaseLock();
  }
}

async function fetchPublic(rawUrl: string, accept: string) {
  let current = await validatePublicUrl(rawUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, { method: "GET", redirect: "manual", headers: { Accept: accept, "User-Agent": "LucyAi-safe-reader/1.0" }, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("Tool request timed out");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new Error("Tool redirect limit reached");
      current = await validatePublicUrl(new URL(location, current).toString());
      continue;
    }
    return { response, body: await readLimited(response), url: current.toString() };
  }
  throw new Error("Tool redirect limit reached");
}

async function publicWebLookup(args: Record<string, unknown>) {
  const query = typeof args.query === "string" ? args.query.trim().slice(0, 240) : "";
  if (!query) throw new Error("A search query is required");
  const limit = Math.max(1, Math.min(MAX_SEARCH_RESULTS, Number(args.limit ?? 3) || 3));
  const tavilyKey = await getTavilyApiKeyForAgent();
  if (tavilyKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: tavilyKey, query, max_results: limit, search_depth: "basic" }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Tavily search returned ${response.status}`);
      const payload = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string }> };
      const results = (payload.results ?? []).slice(0, limit).map(result => ({ title: result.title ?? "Untitled", url: result.url ?? "", snippet: result.content ?? "" }));
      return JSON.stringify({ query, provider: "tavily", results });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("Tavily search timed out");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const { body } = await fetchPublic(searchUrl, "text/html");
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const resultPattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|$)/g;
  for (const match of Array.from(body.matchAll(resultPattern))) {
    let url = decodeHtml(match[1]);
    try {
      const parsed = new URL(url, "https://html.duckduckgo.com");
      if (parsed.hostname.includes("duckduckgo.com") && parsed.searchParams.get("uddg")) url = parsed.searchParams.get("uddg")!;
    } catch {
      continue;
    }
    results.push({ title: decodeHtml(match[2]), url, snippet: decodeHtml(match[3] ?? "") });
    if (results.length >= limit) break;
  }
  if (!results.length) return `No public results found for: ${query}`;
  return JSON.stringify({ query, results });
}

async function fetchPublicUrl(args: Record<string, unknown>) {
  const url = typeof args.url === "string" ? args.url : "";
  if (!url) throw new Error("A URL is required");
  const { body, response, url: finalUrl } = await fetchPublic(url, "text/html,text/plain;q=0.9,application/xhtml+xml;q=0.8");
  const text = decodeHtml(body).slice(0, MAX_OUTPUT);
  return JSON.stringify({ url: finalUrl, status: response.status, contentType: response.headers.get("content-type"), text });
}

async function readPublicJsonApi(args: Record<string, unknown>) {
  const url = typeof args.url === "string" ? args.url : "";
  if (!url) throw new Error("A URL is required");
  const { body, response, url: finalUrl } = await fetchPublic(url, "application/json,text/plain;q=0.8");
  if (!response.ok) throw new Error(`Public API returned ${response.status}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Public API did not return valid JSON");
  }
  return JSON.stringify({ url: finalUrl, data: parsed }).slice(0, MAX_OUTPUT);
}

export async function executeSafeAgentTool(name: string, args: Record<string, unknown>) {
  if (name === "public_web_lookup") return publicWebLookup(args);
  if (name === "fetch_public_url") return fetchPublicUrl(args);
  if (name === "read_public_json_api") return readPublicJsonApi(args);
  throw new Error(`Tool '${name}' is not allowlisted`);
}
