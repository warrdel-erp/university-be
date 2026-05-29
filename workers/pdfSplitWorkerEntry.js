/**
 * pdfSplitWorkerEntry.js
 * Standalone entry point — starts both workers.
 * Run with: node workers/pdfSplitWorkerEntry.js
 * Or auto-spawned via worker_threads from server.js.
 */
import "./pdfSplitOrchestratorWorker.js";
import "./pdfSplitBatchWorker.js";
