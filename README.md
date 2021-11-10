## Reproducing this issue

### My environment

```console 
$ yarn dlx -q envinfo --preset jest

  System:
    OS: macOS 11.5.2
    CPU: (12) x64 Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
  Binaries:
    Node: 14.18.1 - /private/var/folders/9f/kl_c86q5651fqmhmzf63jb0x5t_d9j/T/xfs-bd6e82c9/node
    Yarn: 3.2.0-rc.3.git.20211110.hash-83311e1d4 - /private/var/folders/9f/kl_c86q5651fqmhmzf63jb0x5t_d9j/T/xfs-bd6e82c9/yarn
    npm: 6.14.15 - ~/.volta/tools/image/node/14.18.1/bin/npm

```

This issue is present under both Node 14 and 16. I've provided `yarn run` scripts here for
convenience only; spawning the Next.js bin script directly via `node` also works.


### Running a worker with a custom ESM loader

This project is configured with patched version of `jest-worker@27.3.1` which logs some extra output when a child process is initialized.

Note that in every case, the `messageListener` is registered *after* the parent process sends the initialization payload from `initialize`. It seems likely that the child process has the payload waiting in a buffer while the top level script is executing. The `'message'` event is normally triggered with this payload as soon as the top level script finishes.

```console
$ yarn worker
initialize: [
  0,
  false,
  '/Users/herockk/Workspaces/jest-worker-spawn-bug/test-worker.js',
  []
]
test-worker: called `hi` procedure
processChild: registered messageListener
messageListener: [
  0,
  false,
  '/Users/herockk/Workspaces/jest-worker-spawn-bug/test-worker.js',
  []
]
messageListener: [ 1, true, 'hi', [] ]
hi
```

A custom pass-through ESM loader in [`test-loader.mjs`](./test-loader.mjs) can be loaded with `--experimental-loader`:

```sh
yarn worker-with-loader
```

When a custom loader is passed through, it appears that the initialization payload sent to the worker is lost. The `messageListener` is registered, yet there is no acknowledgement of it from the process child:

```console
$ yarn worker-with-loader
(node:29291) ExperimentalWarning: --experimental-loader is an experimental feature. This feature could change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
initialize: [
  0,
  false,
  '/Users/herockk/Workspaces/jest-worker-spawn-bug/test-worker.js',
  []
]
test-worker: called `hi` procedure
(node:29293) ExperimentalWarning: --experimental-loader is an experimental feature. This feature could change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
processChild: registered messageListener

// end of output
```

An indecent workaround for this is given in [`jest-worker-stall-hack.patch`](.yarn/patches/jest-worker-stall-hack.patch).

This patch will make the main thread stall for 200ms before sending initialization payloads. On my hardware, I needed a timeout of at least 80ms for `hi` to ever be logged in the console. Consistent results were only achievable with at least 100ms.

```bash
sed -i .bak 's/jest-worker-console-debug/jest-worker-stall-hack/' ./package.json && yarn
```

This hack can be tweaked from node_modules:
[`ChildProcessWorker.js`](node_modules/jest-worker/build/workers/ChildProcessWorker.js#L180).
