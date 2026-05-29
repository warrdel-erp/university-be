import { Worker as WorkerThread } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function spawnPdfSplitWorker() {
  // Since launcher is inside /workers, pdfSplitWorkerEntry.js is in the same directory.
  const workerPath = path.join(__dirname, "pdfSplitWorkerEntry.js");
  const worker = new WorkerThread(workerPath);

  worker.on("error", (err) => {
    console.error("[PdfSplitWorker thread] Error:", err.message);
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      console.warn(
        `[PdfSplitWorker thread] Exited with code ${code}. Restarting in 5 seconds...`
      );
      setTimeout(spawnPdfSplitWorker, 5000);
    } else {
      console.log("[PdfSplitWorker thread] Exited cleanly.");
    }
  });

  console.log("[PdfSplitWorker thread] Spawned successfully.");
  return worker;
}

spawnPdfSplitWorker();
