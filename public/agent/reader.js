"use strict";
const section = document.querySelector("#agent-copy");
const status = document.querySelector("#agent-status");
const context = document.querySelector("#agent-context");
const button = document.querySelector("#agent-copy-button");
async function initialize() {
  status.textContent = section.dataset.loading;
  try {
    const files = await Promise.all([section.dataset.llms, section.dataset.rules].map(async path => {
      const url = new URL(path, location.origin);
      if (url.origin !== location.origin) throw Error("Unexpected origin");
      const response = await fetch(url, {credentials:"same-origin",cache:"no-cache"});
      if (!response.ok || response.redirected) throw Error("File unavailable");
      const text = await response.text();
      if (!text.startsWith("# ")) throw Error("Unexpected file");
      return text.trimEnd();
    }));
    context.value = files.join("\n\n---\n\n") + "\n";
    document.querySelector("#agent-copy-tools").hidden = false;
    button.disabled = false;
    status.textContent = section.dataset.ready;
  } catch { status.textContent = section.dataset.unavailable; }
}
button.addEventListener("click", async () => {
  if (!context.value) return;
  try {
    await navigator.clipboard.writeText(context.value);
    status.textContent = section.dataset.done;
  } catch {
    context.focus(); context.select();
    status.textContent = section.dataset.fallback;
  }
});
initialize();
