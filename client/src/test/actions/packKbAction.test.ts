import * as path from 'path';

import { Configuration } from '../../models/configuration';
import { Correlation } from '../../models/content/correlation';
import { PackKbCommand } from '../../views/contentTree/commands/packKbCommand';
import { TestFixture } from '../helper';
import { ContentFolder, ContentFolderType } from '../../models/content/contentFolder';

suite(PackKbCommand.name, () => {

	test('Инициализация', async () => {
		new PackKbCommand(Configuration.get());
	});

	test('Упаковка правила корреляции не вызывает исключений', async () => {
		const config = Configuration.get();
		const pka = new PackKbCommand(config);
		const packageFolder = await ContentFolder.create(TestFixture.getFixturePath("packages", "oneCorrelation"), ContentFolderType.PackageFolder);

		const unpackKbFilePath = path.join(config.getTmpDirectoryPath(), "test.kb");
		await pka.execute(packageFolder, unpackKbFilePath);
	});
});