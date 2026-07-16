const target = process.env.UPTIME_URL || "http://127.0.0.1:5001/api/health";

const run = async () => {
  const startedAt = Date.now();
  const response = await fetch(target, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  const latencyMs = Date.now() - startedAt;

  if (!response.ok || body.status === "degraded") {
    console.error(
      JSON.stringify({ ok: false, target, status: response.status, latencyMs, body })
    );
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, target, status: response.status, latencyMs }));
};

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, target, error: error.message }));
  process.exit(1);
});
