import { spawn, ChildProcess } from "child_process";
import { BASE_URL, TEST_PORT } from "./config";

let serverProcess: ChildProcess | null = null;

async function isServerReady(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      const text = await response.text();
      console.log(
        `Health check returned status: ${response.status}, body: ${text}`
      );
    }
    return response.ok;
  } catch (e) {
    console.log(`Health check error: ${(e as Error).message}`);
    return false;
  }
}

async function waitForServer(timeout = 60000): Promise<void> {
  const startTime = Date.now();
  let lastLog = 0;

  console.log(`Waiting for server at ${BASE_URL}...`);

  while (Date.now() - startTime < timeout) {
    if (await isServerReady()) {
      return;
    }

    if (Date.now() - lastLog > 5000) {
      console.log("Waiting for server to be ready...");
      lastLog = Date.now();
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server failed to start at ${BASE_URL} within ${timeout}ms`);
}

export async function setup() {
  if (await isServerReady()) {
    console.log("Server is already running");
    return;
  }

  console.log(`Starting server on port ${TEST_PORT}...`);

  // Use --port to ensure we listen on the expected port
  // Use --host 127.0.0.1 to ensure we listen on IPv4 loopback, matching our config
  serverProcess = spawn(
    "npm",
    [
      "run",
      "dev:test",
      "--",
      "--port",
      String(TEST_PORT),
      "--host",
      "127.0.0.1",
    ],
    {
      stdio: "inherit",
      env: { ...process.env },
      shell: false,
    }
  );

  serverProcess.on("error", (err) => {
    console.error("Failed to start server process:", err);
  });

  await waitForServer();
  console.log("Server started");
}

export async function teardown() {
  if (serverProcess) {
    console.log("Stopping server...");
    serverProcess.kill();
  }
}
