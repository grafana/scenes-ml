import init, { OutlierDetector } from '@grafana-ml/augurs';

async function init_wasm_in_worker() {
  console.log('Initializing worker');

  // Load the wasm file by awaiting the Promise returned by `wasm_bindgen`.
  await init();
  console.log('Worker initialized');

  // Set callback to handle messages passed to the worker.
  self.onmessage = async (e) => {
    console.log('Message received from main thread: ', e.data);

    const detector = OutlierDetector.dbscan({ sensitivity: 0.1 });
    console.log(detector)

    // Send response back to be handled by callback in main thread.
    self.postMessage('hi from worker');
  };
}

init_wasm_in_worker();
