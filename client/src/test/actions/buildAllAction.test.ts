import { Configuration } from '../../models/configuration';
import { BuildAllCommand } from '../../views/contentTree/commands/buildAllCommand';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';

suite(BuildAllCommand.name, () => {

	test('Инициализация', async () => {
		new BuildAllCommand(
			Configuration.get(),
			new SiemJOutputParser()
		);
	});
});