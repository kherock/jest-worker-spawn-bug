import fs from 'node:fs';
import path from 'node:path';

export async function getFormat(resolved, context, defaultGetFormat) {
  if (!path.extname(resolved)) {
    // https://github.com/nodejs/node/issues/34049
    return { format: 'commonjs' };
  }
  return defaultGetFormat(resolved, context, defaultGetFormat);
}

export async function getSource(urlString, context, defaultGetSource) {
  return defaultGetSource(urlString, context, defaultGetSource);
}

export function resolve(specifier, context, defaultResolve) {
  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  const fileUrl = new URL(url);
  if (!path.extname(fileUrl.pathname)) {
    // https://github.com/nodejs/node/issues/34049
    return {
      format: 'commonjs',
      source: await fs.promises.readFile(fileUrl, `utf8`)
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
