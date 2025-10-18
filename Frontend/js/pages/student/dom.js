const WAIT_INTERVAL_MS = 50;
const WAIT_TIMEOUT_MS = 3000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForElement(
  selector,
  { timeout = WAIT_TIMEOUT_MS, interval = WAIT_INTERVAL_MS } = {}
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
    await delay(interval);
  }
  return null;
}

export async function ensureStudentDom() {
  await waitForElement('#page-student');
  await waitForElement('#class-dropdown');
  await waitForElement('#student-schedule-header');
  await waitForElement('#export-bar-student');
}
