const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const outputDir = path.join(root, "output");
const profileDir = path.join(root, ".electron-render");

const targets = [
  ["wechat-21x9-cover", 2100, 900, "wechat-21x9-cover.png"],
  ["wechat-1x1-cover", 1080, 1080, "wechat-1x1-cover.png"],
  ["article-01-theory", 1080, 1440, "article-01-theory.png"],
  ["article-02-app", 1080, 1440, "article-02-app.png"],
  ["article-03-flow", 1080, 1440, "article-03-flow.png"],
  ["article-04-record", 1080, 1440, "article-04-record.png"],
  ["wechat-cover-pair-preview", 2400, 1180, "wechat-cover-pair-preview.png"],
];

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("no-sandbox");
app.disableHardwareAcceleration();
app.setPath("userData", profileDir);

app.whenReady().then(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const window = new BrowserWindow({
    width: 2100,
    height: 900,
    useContentSize: true,
    show: false,
    frame: false,
    webPreferences: { sandbox: false },
  });

  for (const [id, width, height, fileName] of targets) {
    window.setContentSize(width, height);
    await window.loadFile(path.join(root, "index.html"));
    await window.webContents.executeJavaScript(`
      document.body.style.padding = "0";
      document.body.style.background = "transparent";
      document.querySelector(".sheet").style.display = "block";
      document.querySelector(".sheet").style.gap = "0";
      document.querySelectorAll(".poster,.pair-preview").forEach((node) => {
        if (node.id !== ${JSON.stringify(id)}) {
          node.style.display = "none";
        } else {
          node.style.display = node.classList.contains("pair-preview") ? "grid" : "block";
        }
      });
    `);
    await wait(id.includes("cover-pair") ? 500 : 900);
    const image = await window.webContents.capturePage({ x: 0, y: 0, width, height });
    fs.writeFileSync(path.join(outputDir, fileName), image.toPNG());
  }

  window.destroy();
  app.quit();
});
