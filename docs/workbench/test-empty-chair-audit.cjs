const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");

const pageUrl = "file:///E:/%E7%A9%BA%E6%A4%85%E5%AD%90/%E5%8F%91%E5%B8%83%E7%89%88/%E7%A9%BA%E6%A4%85%E5%AD%90.html";
const outputDir = "E:/视频新方案工具/.tmp/empty-chair-audit";
const userDataDir = "E:/视频新方案工具/.tmp/empty-chair-audit-profile";

async function run(window, code) {
  return window.webContents.executeJavaScript(code, true);
}

async function pause(ms = 420) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("no-sandbox");
app.disableHardwareAcceleration();
app.setPath("userData", userDataDir);

app.whenReady().then(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const window = new BrowserWindow({
    width: 1365,
    height: 900,
    useContentSize: true,
    show: false,
    webPreferences: { sandbox: false },
  });

  const errors = [];
  window.webContents.on("console-message", (event) => {
    if (event.level === "error") errors.push(event.message);
  });

  try {
    await window.loadURL(pageUrl);
    await run(window, `
      document.head.insertAdjacentHTML("beforeend", "<style>*{animation:none!important;transition:none!important}.page.active,.modal-backdrop.open{opacity:1!important;transform:none!important}</style>");
      localStorage.removeItem(STORAGE_KEY);
      updateHistoryCount();
    `);
    await pause();
    fs.writeFileSync(`${outputDir}/01-home.png`, (await window.webContents.capturePage()).toPNG());

    await run(window, `openTheory()`);
    await pause();
    fs.writeFileSync(`${outputDir}/02-theory.png`, (await window.webContents.capturePage()).toPNG());
    await run(window, `closeTheory(); selectEmotion("angry");`);
    await pause();
    fs.writeFileSync(`${outputDir}/03-expression.png`, (await window.webContents.capturePage()).toPNG());

    const preservedDraft = await run(window, `
      document.getElementById("becauseInput").value = "一次测试";
      document.querySelectorAll(".mode-tabs .tab-btn")[1].click();
      document.querySelectorAll(".mode-tabs .tab-btn")[0].click();
      document.getElementById("becauseInput").value;
    `);

    const emptyFeedback = await run(window, `
      clearExpression();
      submitExpression();
      document.getElementById("formStatus").textContent;
    `);

    await run(window, `
      document.getElementById("becauseInput").value = "一件让我很生气的事";
      document.getElementById("feelInput").value = "委屈";
      document.getElementById("hopeInput").value = "被认真听见";
      submitExpression();
    `);
    await pause();
    fs.writeFileSync(`${outputDir}/04-response.png`, (await window.webContents.capturePage()).toPNG());

    const responseFeedback = await run(window, `
      submitResponse();
      document.getElementById("formStatus").textContent;
    `);

    await run(window, `
      document.getElementById("responseInput").value = "你的感受值得被看见";
      submitResponse();
    `);
    await pause();
    fs.writeFileSync(`${outputDir}/05-complete.png`, (await window.webContents.capturePage()).toPNG());

    await run(window, `showHistory(lastSavedId)`);
    await pause();
    fs.writeFileSync(`${outputDir}/06-history.png`, (await window.webContents.capturePage()).toPNG());

    const injectionSafe = await run(window, `
      const h = getHistory();
      h[0].expression.freeText = '<img id="injected-image" src=x onerror="window.injected=true">';
      h[0].expression.because = "";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
      renderHistory();
      !document.getElementById("injected-image") && !window.injected;
    `);

    const storageRoundtrip = await run(window, `
      const saved = JSON.stringify(getHistory());
      setHistory([]);
      const cleared = getHistory().length === 0;
      setHistory(JSON.parse(saved));
      cleared && getHistory().length === 1;
    `);

    const restoreRoundtrip = await run(window, `
      (async () => {
        const saved = getHistory();
        setHistory([]);
        const previousConfirm = window.confirm;
        window.confirm = () => true;
        await restoreHistory({
          target: {
            files: [new File([JSON.stringify({app:"空椅子",version:1,records:saved})], "backup.json", {type:"application/json"})],
            value: "backup.json"
          }
        });
        window.confirm = previousConfirm;
        return getHistory().length === saved.length;
      })()
    `);

    const maliciousBackupRejected = await run(window, `
      (async () => {
        const before = getHistory().length;
        const previousConfirm = window.confirm;
        window.confirm = () => true;
        await restoreHistory({
          target: {
            files: [new File([JSON.stringify({records:[{
              id:'bad" onclick="window.hacked=true',
              emotionId:'angry',
              expression:{because:'x',feel:'',hope:'',freeText:''},
              response:{text:'x'},
              stars:0
            }]})], "bad.json", {type:"application/json"})],
            value: "bad.json"
          }
        });
        window.confirm = previousConfirm;
        return getHistory().length === before && !window.hacked;
      })()
    `);

    const allEmotionPhrasesComplete = await run(window, `
      allEmotions().length === 8 && allEmotions().every((emotion) =>
        PHRASES[emotion.id] && PHRASES[emotion.id].opening && PHRASES[emotion.id].listening && PHRASES[emotion.id].switchChair
      )
    `);

    await run(window, `resetAndGoHome()`);
    window.setContentSize(1024, 768);
    await pause(120);
    const overflow1024 = await run(window, `document.documentElement.scrollWidth > document.documentElement.clientWidth`);
    fs.writeFileSync(`${outputDir}/07-home-1024.png`, (await window.webContents.capturePage()).toPNG());

    window.setContentSize(760, 900);
    await pause(120);
    const overflow760 = await run(window, `document.documentElement.scrollWidth > document.documentElement.clientWidth`);
    fs.writeFileSync(`${outputDir}/08-home-760.png`, (await window.webContents.capturePage()).toPNG());

    const result = await run(window, `({
      title: document.title,
      preservedDraft: ${JSON.stringify(preservedDraft)},
      emptyFeedback: ${JSON.stringify(emptyFeedback)},
      responseFeedback: ${JSON.stringify(responseFeedback)},
      injectionSafe: ${JSON.stringify(injectionSafe)},
      storageRoundtrip: ${JSON.stringify(storageRoundtrip)},
      restoreRoundtrip: ${JSON.stringify(restoreRoundtrip)},
      maliciousBackupRejected: ${JSON.stringify(maliciousBackupRejected)},
      allEmotionPhrasesComplete: ${JSON.stringify(allEmotionPhrasesComplete)},
      overflow1024: ${JSON.stringify(overflow1024)},
      overflow760: ${JSON.stringify(overflow760)},
      historyCount: getHistory().length,
      visiblePage: document.querySelector(".page.active").id,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      theoryPresent: document.getElementById("theoryModal").innerText.includes("格式塔疗法"),
      localPrivacyPresent: document.body.textContent.includes("不上传内容"),
      safetyPresent: document.body.textContent.includes("12356")
    })`);
    result.consoleErrors = errors;
    fs.writeFileSync(`${outputDir}/result.json`, JSON.stringify(result, null, 2));
  } catch (error) {
    fs.writeFileSync(`${outputDir}/error.txt`, String(error?.stack || error));
    process.exitCode = 1;
  } finally {
    window.destroy();
    app.quit();
  }
});
