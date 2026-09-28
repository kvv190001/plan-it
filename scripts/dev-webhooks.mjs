// Starts `clerk webhooks listen`, forwarding Clerk webhook deliveries to the
// local backend. Reads the pinned relay token from apps/backend/.env.local
// (CLERK_WEBHOOK_RELAY_TOKEN) so the relay URL stays stable across restarts
// and doesn't need re-registering in the Clerk Dashboard every time.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../apps/backend/.env.local", import.meta.url));
const env = readFileSync(envPath, "utf8");
const match = env.match(/^CLERK_WEBHOOK_RELAY_TOKEN=(.+)$/m);

if (!match) {
  console.error(
    "CLERK_WEBHOOK_RELAY_TOKEN not found in apps/backend/.env.local.\n" +
      "Run `clerk webhooks token`, register the printed relay URL as a webhook endpoint\n" +
      "in the Clerk Dashboard, then add CLERK_WEBHOOK_RELAY_TOKEN=<token> to apps/backend/.env.local.",
  );
  process.exit(1);
}

const token = match[1].trim();
const child = spawn(
  `clerk webhooks listen --token ${token} --forward-to http://localhost:4000/webhooks/clerk`,
  { stdio: "inherit", shell: true },
);

child.on("exit", (code) => process.exit(code ?? 0));
