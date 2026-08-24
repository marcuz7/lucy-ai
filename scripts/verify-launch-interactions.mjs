import { chromium } from "playwright";

const url = process.env.LUCYAI_PREVIEW_URL || "http://127.0.0.1:3000/";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });
const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
await context.addInitScript(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => undefined }, configurable: true });
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });

await page.locator(".open-messages").first().click();
if (!(await page.getByText("Your first agent").isVisible())) throw new Error("Launch modal did not open");
await page.getByRole("button", { name: "Close launch dialog" }).click();

const smsHref = await page.locator(".launch-sms").getAttribute("href");
if (smsHref !== "sms:+84837841663?body=Hi%20Lucy") throw new Error(`Unexpected SMS href: ${smsHref}`);
if ((await page.locator(".launch-qr svg").count()) !== 1) throw new Error("Launch QR code is missing");

await page.locator(".launch-number").click();
if (!(await page.locator(".launch-number").getByText("Copied").isVisible())) throw new Error("Copy feedback did not appear");

console.log("Launch interaction verification passed: modal, SMS href, QR code, and copy feedback.");
await browser.close();
