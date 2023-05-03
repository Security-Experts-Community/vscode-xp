import * as path from 'path';

import { Configuration } from '../../models/configuration';
import { Correlation } from '../../models/content/correlation';
import { PackKbAction } from '../../views/contentTree/actions/packKbAction';
import { TestFixture } from '../helper';
import { ContentFolder, ContentFolderType } from '../../models/content/contentFolder';

suite(PackKbAction.name, () => {

	test('Инициализация', async () => {
		new PackKbAction(Configuration.get());
	});

	test('Упаковка правила корреляции не вызывает исключений', async () => {
		const config = Configuration.get();
		const pka = new PackKbAction(config);
		const packageFolder = await ContentFolder.create(TestFixture.getFixturePath("packages", "oneCorrelation"), ContentFolderType.PackageFolder);

		const unpackKbFilePath = path.join(config.getTmpDirectoryPath(), "test.kb");
		await pka.run(packageFolder, unpackKbFilePath);
	});
});