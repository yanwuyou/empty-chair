const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const pageUrl = "file:///E:/%E7%A9%BA%E6%A4%85%E5%AD%90/%E5%8F%91%E5%B8%83%E7%89%88/%E7%A9%BA%E6%A4%85%E5%AD%90.html";
const root = __dirname;
const assetsDir = path.join(root, "assets");
const profileDir = path.join(root, ".electron-capture");

async function run(window, code) {
  return window.webContents.executeJavaScript(code, true);
}

async function pause(ms = 300) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureApp(window, name) {
  await pause();
  const rect = await run(window, `(() => {
    const r = document.querySelector(".app").getBoundingClientRect();
    return {x: Math.max(0, Math.floor(r.x)), y: Math.max(0, Math.floor(r.y)), width: Math.ceil(r.width), height: Math.ceil(r.height)};
  })()`);
  const image = await window.webContents.capturePage(rect);
  fs.writeFileSync(path.join(assetsDir, name), image.toPNG());
}

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("no-sandbox");
app.disableHardwareAcceleration();
app.setPath("userData", profileDir);

app.whenReady().then(async () => {
  fs.mkdirSync(assetsDir, { recursive: true });
  const window = new BrowserWindow({
    width: 1365,
    height: 900,
    useContentSize: true,
    show: false,
    webPreferences: { sandbox: false },
  });

  await window.loadURL(pageUrl);
  await run(window, `
    document.head.insertAdjacentHTML("beforeend", "<style>*{animation:none!important;transition:none!important}.page.active,.modal-backdrop.open{opacity:1!important;transform:none!important}.notice{display:none!important}</style>");
    localStorage.removeItem(STORAGE_KEY);
    updateHistoryCount();
  `);
  await captureApp(window, "ui-home.png");

  await run(window, `openTheory()`);
  await pause();
  fs.writeFileSync(path.join(assetsDir, "ui-theory.png"), (await window.webContents.capturePage()).toPNG());

  await run(window, `
    closeTheory();
    selectEmotion("angry");
    document.getElementById("becauseInput").value = "被误解的一件事";
    document.getElementById("feelInput").value = "委屈，也有一点生气";
    document.getElementById("hopeInput").value = "能把真实想法说清楚";
    submitExpression();
  `);
  await captureApp(window, "ui-response.png");

  await run(window, `
    document.getElementById("responseInput").value = "先别急着证明自己，你的感受已经被看见。";
    submitResponse();
  `);
  await captureApp(window, "ui-complete.png");

  await run(window, `rateStars(2); showHistory(lastSavedId);`);
  await captureApp(window, "ui-history.png");

  window.destroy();
  app.quit();
});
