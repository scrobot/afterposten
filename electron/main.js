const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const DEV_PORT = 3000;
const isProd = app.isPackaged;

let mainWindow = null;
let nextServer = null;

function findAvailablePort(startPort) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.on("error", () => resolve(findAvailablePort(startPort + 1)));
    });
}

async function startNextServer(port) {
    return new Promise((resolve, reject) => {
        const serverPath = isProd
            ? path.join(process.resourcesPath, "app")
            : path.join(__dirname);

        const env = {
            ...process.env,
            PORT: String(port),
            NODE_ENV: isProd ? "production" : "development",
        };

        if (isProd) {
            // In production, run the standalone server
            const serverJs = path.join(serverPath, ".next", "standalone", "server.js");
            nextServer = spawn(process.execPath, [serverJs], {
                cwd: path.join(serverPath, ".next", "standalone"),
                env,
                stdio: "pipe",
            });
        } else {
            // In dev, run `next dev`
            const nextBin = path.join(__dirname, "node_modules", ".bin", "next");
            nextServer = spawn(nextBin, ["dev", "--port", String(port)], {
                cwd: __dirname,
                env,
                stdio: "pipe",
            });
        }

        let resolved = false;

        nextServer.stdout?.on("data", (data) => {
            const msg = data.toString();
            process.stdout.write(msg);
            if (!resolved && (msg.includes("Ready") || msg.includes("started"))) {
                resolved = true;
                // Give it a moment to fully initialize
                setTimeout(() => resolve(port), 500);
            }
        });

        nextServer.stderr?.on("data", (data) => {
            process.stderr.write(data.toString());
        });

        nextServer.on("error", (err) => {
            if (!resolved) reject(err);
        });

        nextServer.on("close", (code) => {
            if (!resolved) reject(new Error(`Next.js exited with code ${code}`));
        });

        // Timeout after 30s
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(port); // Try anyway
            }
        }, 30_000);
    });
}

function createWindow(port) {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 900,
        minHeight: 600,
        title: "Afterposten",
        titleBarStyle: "hiddenInset",
        trafficLightPosition: { x: 16, y: 16 },
        backgroundColor: "#0a0a0f",
        webPreferences: {
            preload: path.join(__dirname, "electron", "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadURL(`http://localhost:${port}/posts`);

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("http")) {
            shell.openExternal(url);
        }
        return { action: "deny" };
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    try {
        const port = await findAvailablePort(DEV_PORT);
        await startNextServer(port);
        createWindow(port);
    } catch (err) {
        console.error("Failed to start:", err);
        app.quit();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (mainWindow === null) {
        findAvailablePort(DEV_PORT).then((port) => createWindow(port));
    }
});

app.on("before-quit", () => {
    if (nextServer) {
        nextServer.kill();
        nextServer = null;
    }
});
