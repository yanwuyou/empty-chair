const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const pageUrl = "file:///E:/%E7%A9%BA%E6%A4%85%E5%AD%90/%E5%8F%91%E5%B8%83%E7%89%88/%E7%A9%BA%E6%A4%85%E5%AD%90.html";
const outputFile = path.join(__dirname, "final-check.json");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("no-sandbox");
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1365,
    height: 900,
    useContentSize: true,
    show: false,
    frame: false,
    webPreferences: { sandbox: false },
  });

  const consoleErrors = [];
  win.webContents.on("console-message", (_event, level, message) => {
    if (level === 3) consoleErrors.push(message);
  });

  const js = (code) => win.webContents.executeJavaScript(code, true);

  try {
    await win.loadURL(pageUrl);
    await js(`
      localStorage.removeItem(STORAGE_KEY);
      updateHistoryCount();
    `);

    const hasTheory = await js(`document.body.textContent.includes("格式塔疗法")`);
    const hasSafety = await js(`document.body.textContent.includes("12356")`);
    const hasLocalPrivacy = await js(`document.body.textContent.includes("不上传内容") && document.body.textContent.includes("本地")`);

    await js(`selectEmotion("angry")`);
    await wait(100);
    await js(`
      document.getElementById("becauseInput").value = "一件让我生气的事";
      document.getElementById("feelInput").value = "委屈";
      document.getElementById("hopeInput").value = "被认真听见";
      submitExpression();
    `);
    await wait(100);
    const responseStepRendered = await js(`dialogueStep === 2 && !!document.getElementById("responseInput")`);
    await js(`
      document.getElementById("responseInput").value = "我听见了你，也愿意陪你慢慢说完。";
      submitResponse();
    `);
    await wait(100);

    const historySaved = await js(`getHistory().length === 1`);
    const onCompletePage = await js(`document.querySelector(".page.active").id === "page-complete"`);
    const injectionSafe = await js(`
      const h = getHistory();
      h[0].expression.freeText = '<img id="bad-injection" src=x onerror="window.badInjected=true">';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
      renderHistory();
      !document.getElementById("bad-injection") && !window.badInjected;
    `);

    win.setContentSize(1024, 768);
    await wait(100);
    const noOverflow1024 = await js(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`);
    win.setContentSize(760, 900);
    await wait(100);
    const noOverflow760 = await js(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`);

    const result = {
      title: await js(`document.title`),
      hasTheory,
      hasSafety,
      hasLocalPrivacy,
      responseStepRendered,
      onCompletePage,
      historySaved,
      injectionSafe,
      noOverflow1024,
      noOverflow760,
      consoleErrors,
      passed: [
        hasTheory,
        hasSafety,
        hasLocalPrivacy,
        responseStepRendered,
        onCompletePage,
        historySaved,
        injectionSafe,
        noOverflow1024,
        noOverflow760,
        consoleErrors.length === 0,
      ].every(Boolean),
    };

    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf8");
    process.exitCode = result.passed ? 0 : 1;
  } catch (error) {
    fs.writeFileSync(outputFile, JSON.stringify({
      passed: false,
      error: String(error && error.stack || error),
    }, null, 2), "utf8");
    process.exitCode = 1;
  } finally {
    win.destroy();
    app.quit();
  }
});
