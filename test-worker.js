const { Worker: JestWorker } = require('jest-worker');
require('next');

Object.assign(exports, {
  hi() {
    console.log('hi');
  }
});

if (!process.send) {
  const worker = new JestWorker(__filename, {
    exposedMethods: Object.keys(exports),
    numWorkers: 1,
  });
  worker.getStdout().pipe(process.stdout);
  worker.getStderr().pipe(process.stderr);
  worker.hi();
  console.log('test-worker: called `hi` procedure')
}
