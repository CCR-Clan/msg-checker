import listText from "./list.txt" with { type: "text" };
console.log("Worker module loaded");

type Body = {
    message: string;
}

type TrieNode = {
  next: Map<string, TrieNode>;
  terminal: string | null;
};

const root: TrieNode = { next: new Map(), terminal: null };

const terms = Array.from(
  new Set(
    listText
      .split(/\r?\n/)
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0)
  )
);

for (const term of terms) {
  let node = root;
  for (const ch of term) {
    let child = node.next.get(ch);
    if (!child) {
      child = { next: new Map(), terminal: null };
      node.next.set(ch, child);
    }
    node = child;
  }
  node.terminal = term;
}

function findContainedTerm(message: string): string | null {
  const haystack = message.toLowerCase();
  for (let i = 0; i < haystack.length; i++) {
    let node = root.next.get(haystack.charAt(i));
    if (!node) continue;
    if (node.terminal) return node.terminal;
    for (let j = i + 1; j < haystack.length; j++) {
      node = node.next.get(haystack.charAt(j)) as TrieNode;
      if (!node) break;
      if (node.terminal) return node.terminal;
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

      if (normalizedMessage.length === 0 || normalizedMessage === "{check.response.result}") {
        return Response.json({ result: "GOOD" });
      }

      try {
        const parsedUrl = new URL(normalizedMessage);
        if (parsedUrl.pathname.toLowerCase().endsWith(".gif")) {
          return Response.json({ result: "GOOD" });
        }
      } catch {
      }

      const matched = findContainedTerm(normalizedMessage);

      return Response.json({ result: matched ? "BAD" : "GOOD" });
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