import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});

// Auto-spawn PDF Split Worker via worker_threads
import "./workers/pdfSplitWorkerLauncher.js";
