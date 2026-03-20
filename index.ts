import listText from "./list.txt" with { type: "text" };
console.log("Worker module loaded");

type Body = {
    message: string;
}

const terms = Array.from(
  new Set(
    listText
      .split(/\r?\n/)
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0)
  )
);

const hostPattern = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b/gi;

function normalizeHost(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  if (trimmed.length === 0 || trimmed.length > 253) {
    return null;
  }
  const labels = trimmed.split(".");
  if (labels.length < 2) {
    return null;
  }
  for (const label of labels) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
      return null;
    }
  }
  return labels.join(".");
}

const blockedHosts = new Set(
  terms
    .map((term) => normalizeHost(term))
    .filter((term): term is string => term !== null)
);

function findBlockedHostInMessage(message: string): string | null {
  const candidates = new Set<string>();

  try {
    const parsed = new URL(message);
    if (parsed.hostname) {
      candidates.add(parsed.hostname);
    }
  } catch {
  }

  for (const match of message.toLowerCase().matchAll(hostPattern)) {
    candidates.add(match[0]);
  }

  for (const candidate of candidates) {
    const host = normalizeHost(candidate);
    if (!host) {
      continue;
    }
    let current = host;
    while (true) {
      if (blockedHosts.has(current)) {
        return current;
      }
      const lastDot = current.lastIndexOf(".");
      if (lastDot === -1) {
        break;
      }
      current = current.slice(0, lastDot);
    }

    if (host.startsWith("www.")) {
      current = host.slice(4);
      while (true) {
        if (blockedHosts.has(current)) {
          return current;
        }
        const lastDot = current.lastIndexOf(".");
        if (lastDot === -1) {
          break;
        }
        current = current.slice(0, lastDot);
      }
    }
  }

  return null;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/check") {
      let body: Body | null = null;

      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }

      console.log(body);

      if (!body || typeof body.message !== "string") {
        return Response.json({ error: "message must be a string" }, { status: 400 });
      }

      const normalizedMessage = body.message.trim();
      const lowerMessage = normalizedMessage.toLowerCase();

      if (normalizedMessage.length === 0 || normalizedMessage === "{check.response.result}") {
        return Response.json({ result: "GOOD" });
      }

      const matched = findBlockedHostInMessage(normalizedMessage);
      if (matched) {
        return Response.json({ result: "BAD" });
      }

      if (/\.gif(?:[?#].*)?$/i.test(lowerMessage)) {
        return Response.json({ result: "GOOD" });
      }

      try {
        const parsedUrl = new URL(normalizedMessage);
        if (parsedUrl.pathname.toLowerCase().endsWith(".gif")) {
          return Response.json({ result: "GOOD" });
        }
      } catch {
      }

      return Response.json({ result: "GOOD" });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        name: "msg-checker",
        status: "ok",
        endpoints: ["POST /check"],
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};