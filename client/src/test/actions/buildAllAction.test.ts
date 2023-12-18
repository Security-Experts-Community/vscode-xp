import { Configuration } from '../../models/configuration';
import { BuildAllGraphCommand } from '../../views/contentTree/commands/buildAllGraphCommand';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';

suite(BuildAllGraphCommand.name, () => {

	test('Инициализация', async () => {
		new BuildAllGraphCommand(
			Configuration.get(),
			new SiemJOutputParser()
		);
	});
});