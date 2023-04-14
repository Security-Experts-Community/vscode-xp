import { Configuration } from '../../models/configuration';
import { BuildAllAction } from '../../views/contentTree/actions/buildAllAction';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';

suite(BuildAllAction.name, () => {

	test('Инициализация', async () => {
		new BuildAllAction(
			Configuration.get(),
			new SiemJOutputParser()
		);
	});
});