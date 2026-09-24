// Can the headless Chrome we already use encode a video by itself? (MediaRecorder on a canvas stream)
//   npx tsx --conditions=react-server scripts/check-recorder.ts
import { launch } from "../lib/design-extract";
async function main() {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.goto("about:blank");
    const r = await page.evaluate(`(async () => {
      const ok = { rec: typeof MediaRecorder, vp9: MediaRecorder.isTypeSupported("video/webm;codecs=vp9"), vp8: MediaRecorder.isTypeSupported("video/webm;codecs=vp8"), av1: MediaRecorder.isTypeSupported("video/webm;codecs=av1"), h264: MediaRecorder.isTypeSupported("video/mp4;codecs=avc1"), opus: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") };
      const c = document.createElement("canvas"); c.width = 640; c.height = 360; const ctx = c.getContext("2d");
      const stream = c.captureStream(10);
      const chunks = [];
      const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      rec.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise((res) => { rec.onstop = res; });
      rec.start(100);
      for (let i = 0; i < 12; i++) { ctx.fillStyle = "hsl(" + (i * 30) + " 70% 50%)"; ctx.fillRect(0, 0, 640, 360); await new Promise((r) => setTimeout(r, 100)); }
      rec.stop(); await done;
      const blob = new Blob(chunks, { type: "video/webm" });
      return { ...ok, bytes: blob.size };
    })()`);
    console.log(JSON.stringify(r));
  } finally { await browser.close(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
