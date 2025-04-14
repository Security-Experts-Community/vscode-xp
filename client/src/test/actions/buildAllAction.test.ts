import { Configuration } from '../../models/configuration';
import { BuildAllGraphsAndTableListsCommand } from '../../views/contentTree/commands/buildAllGraphsAndTableListsCommand';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';

suite(BuildAllGraphsAndTableListsCommand.name, () => {
  test('Инициализация', async () => {
    const config = Configuration.get();
    new BuildAllGraphsAndTableListsCommand(config, new SiemJOutputParser(config));
  });
});
