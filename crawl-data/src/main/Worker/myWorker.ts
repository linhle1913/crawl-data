// worker.ts
import { parentPort } from 'worker_threads';

parentPort?.on('message', (data: number) => {
  const result = performHeavyComputation(data);
  parentPort?.postMessage(result);
});

function performHeavyComputation(data: number): number {
  return data * 2;
}
