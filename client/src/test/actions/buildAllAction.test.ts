import { Configuration } from '../../models/configuration';
import { BuildAllGraphsAndTableListsCommand } from '../../views/contentTree/commands/buildAllGraphsAndTableListsCommand';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';

suite(BuildAllGraphsAndTableListsCommand.name, () => {

	test('Инициализация', async () => {
		new BuildAllGraphsAndTableListsCommand(
			Configuration.get(),
			new SiemJOutputParser()
		);
	});
});