import * as path from 'path';

import { Configuration } from '../../models/configuration';
import { PackKbCommand } from '../../views/contentTree/commands/packKbCommand';
import { TestFixture } from '../helper';
import { ContentFolder, ContentFolderType } from '../../models/content/contentFolder';

suite(PackKbCommand.name, () => {
  test('Упаковка правила корреляции не вызывает исключений', async () => {
    const config = Configuration.get();

    const packageFolder = await ContentFolder.create(
      TestFixture.getFixturePath('packages', 'oneCorrelation'),
      ContentFolderType.PackageFolder
    );
    const unpackKbFilePath = path.join(config.getTmpDirectoryPath(), 'test.kb');
    const pka = new PackKbCommand(config, packageFolder, unpackKbFilePath);
    await pka.execute();
  });
});
