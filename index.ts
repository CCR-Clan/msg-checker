console.log("Worker module loaded");

type Body = {
    message: string;
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

      return Response.json({ message: "OK", body });
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