const puppeteer = require("puppeteer-core");

let browserInstance = null;

const getBrowser = async () => {
  if (browserInstance) {
    try {
      await browserInstance.version();
      return browserInstance;
    } catch (e) {
      console.log("Browser instance dead, restarting:", e.message);
      browserInstance = null;
    }
  }

  browserInstance = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  });

  console.log("Browser launched successfully (quotation PDF pool)");
  return browserInstance;
};

const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
};

module.exports = { getBrowser, closeBrowser };