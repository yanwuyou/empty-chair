const {app, BrowserWindow} = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const pageUrl = "file:///E:/%E7%A9%BA%E6%A4%85%E5%AD%90/%E5%8F%91%E5%B8%83%E7%89%88/%E7%A9%BA%E6%A4%85%E5%AD%90.html";
const outputDir = "E:/视频新方案工具/.tmp/empty-chair-custom-emotion";
const resultPath = path.join(outputDir, "custom-emotion-check.json");
const screenshotPath = path.join(outputDir, "custom-emotion-home.png");
const modalScreenshotPath = path.join(outputDir, "custom-emotion-modal.png");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("no-sandbox");
app.disableHardwareAcceleration();
app.setPath("userData", path.join(outputDir, "profile"));

app.whenReady().then(async () => {
  fs.mkdirSync(outputDir, {recursive: true});
  const win = new BrowserWindow({
    width: 1365,
    height: 900,
    useContentSize: true,
    show: false,
    frame: false,
    webPreferences: {sandbox: false},
  });
  const js = (code) => win.webContents.executeJavaScript(code, true);
  const consoleErrors = [];
  win.webContents.on("console-message", (event) => {
    if (event.level === "error") consoleErrors.push(event.message);
  });

  try {
    await win.loadURL(pageUrl);
    await js(`
      localStorage.removeItem(STORAGE_KEY);
      updateHistoryCount();
      document.head.insertAdjacentHTML("beforeend", "<style>*{animation:none!important;transition:none!important}.page.active,.modal-backdrop.open{opacity:1!important;transform:none!important}</style>");
    `);
    await wait(500);
    fs.writeFileSync(screenshotPath, (await win.webContents.capturePage()).toPNG());

    const customCardPresent = await js(`document.querySelector(".custom-emotion-card")?.textContent.includes("写下自己的感受")`);
    await js(`openCustomEmotion()`);
    await wait(220);
    fs.writeFileSync(modalScreenshotPath, (await win.webContents.capturePage()).toPNG());
    const modalOpened = await js(`document.getElementById("customEmotionModal").classList.contains("open")`);
    await js(`submitCustomEmotion({preventDefault(){}})`);
    const emptyBlocked = await js(`document.getElementById("customEmotionStatus").textContent.includes("请先写下")`);

    await js(`
      document.getElementById("customEmotionInput").value = "委屈";
      submitCustomEmotion({preventDefault(){}});
    `);
    const customDialogueStarted = await js(`
      currentEmotion?.id === "custom" &&
      currentEmotion?.name === "委屈" &&
      document.getElementById("roomNote").textContent.includes("值得被你认真听见")
    `);

    await js(`
      document.getElementById("becauseInput").value = "我的感受没有被听见";
      document.getElementById("feelInput").value = "很难受";
      document.getElementById("hopeInput").value = "有人理解";
      submitExpression();
      document.getElementById("responseInput").value = "我听见你的委屈了。";
      submitResponse();
    `);

    const customHistorySaved = await js(`
      const history = getHistory();
      history.length === 1 &&
      history[0].emotionId === "custom" &&
      history[0].emotionName === "委屈" &&
      history[0].emotionIcon === "💭"
    `);
    const customBackupCompatible = await js(`
      const saved = JSON.parse(JSON.stringify(getHistory()[0]));
      const normalized = normalizeRecord(saved);
      normalized?.emotionId === "custom" && normalized?.emotionName === "委屈"
    `);
    const unsafeNameSanitized = await js(`safeFileNamePart('迷茫:困惑?') === "迷茫困惑"`);
    const versionUpdated = await js(`document.body.textContent.includes("DESKTOP · v1.3")`);
    const noHorizontalOverflow = await js(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`);

    const result = {
      customCardPresent,
      modalOpened,
      emptyBlocked,
      customDialogueStarted,
      customHistorySaved,
      customBackupCompatible,
      unsafeNameSanitized,
      versionUpdated,
      noHorizontalOverflow,
      consoleErrors,
    };
    result.passed = Object.entries(result)
      .filter(([key]) => key !== "consoleErrors")
      .every(([, value]) => value === true) && consoleErrors.length === 0;
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");
    process.exitCode = result.passed ? 0 : 1;
  } catch (error) {
    fs.writeFileSync(resultPath, JSON.stringify({passed: false, error: String(error?.stack || error)}, null, 2), "utf8");
    process.exitCode = 1;
  } finally {
    win.destroy();
    app.quit();
  }
});
