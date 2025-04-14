import * as path from 'path';
import Mocha from 'mocha';

import { FileSystemHelper } from '../helpers/fileSystemHelper';

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });
  mocha.timeout(20000);

  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    const files = FileSystemHelper.getRecursiveFilesSync(testsRoot);

    const testFiles = files.filter((f) => {
      const matchPostfix = /.*\.test\.js$/g;
      const result = matchPostfix.test(f);
      return result;
    });

    // Add files to the test suite
    testFiles.forEach((f) => {
      const resolvedPath = path.resolve(testsRoot, f);
      mocha.addFile(resolvedPath);
    });

    try {
      // Run the mocha test
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}
