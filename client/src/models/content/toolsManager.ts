import * as fs from 'fs';

import { Configuration } from '../configuration';
import { Log } from '../../extension';
import { OsType } from '../locator/pathLocator';

export class ToolsManager {
  public static async init(config: Configuration): Promise<void> {
    const evtxToJsonToolFullPath = config.getEvtxToJsonToolFullPath();

    switch (config.getOsType()) {
      case OsType.Linux: {
        const toolStat = await fs.promises.stat(evtxToJsonToolFullPath);
        if (!(fs.constants.S_IXUSR & toolStat.mode)) {
          // Added a bit of execution
          Log.debug(
            `The utility file '${evtxToJsonToolFullPath}' has ${toolStat.mode.toString(16)}`
          );

          await fs.promises.chmod(evtxToJsonToolFullPath, 0x544);
          Log.debug(`The utility file '${evtxToJsonToolFullPath}' is assigned an executable flag`);
        }
        break;
      }
    }
  }
}
