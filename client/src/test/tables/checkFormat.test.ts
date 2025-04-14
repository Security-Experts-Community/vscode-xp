import * as assert from 'assert';

import { ContentHelper } from '../../helpers/contentHelper';
import { YamlHelper } from '../../helpers/yamlHelper';

suite('Формат табличных списков', () => {
  test('Строковая колонка не содержит кавычек вокруг числа и даты', () => {
    const tableContent = `name: TEST
fillType: Registry
type: 1
userCanEditContent: false
fields:
- host_type:
    type: String
- srcip:
    type: String
- datestr:
    type: String
- date:
    type: Date
- desc:
    type: Number
defaults:
  LOC:
  - host_type: 10
    srcip: 127.0.0.1
    datestr: 2023-01-01
    date: 2023-01-01
    desc: 10
  - host_type:
    srcip: 300.0.0.1
    datestr: '2023-01-01'
    date: 2023-01-01
    desc:`;

    const expectedContent = `name: TEST
fillType: Registry
type: 1
userCanEditContent: false
fields:
  - host_type:
      type: String
  - srcip:
      type: String
  - datestr:
      type: String
  - date:
      type: Date
  - desc:
      type: Number
defaults:
  LOC:
    - host_type: "10"
      srcip: 127.0.0.1
      datestr: "2023-01-01T00:00:00.000Z"
      date: 2023-01-01T00:00:00.000Z
      desc: 10
    - host_type: 
      srcip: 300.0.0.1
      datestr: "2023-01-01"
      date: 2023-01-01T00:00:00.000Z
      desc: 
`;
    const fixedTable = ContentHelper.fixTableYaml(YamlHelper.parse(tableContent));
    assert.strictEqual(fixedTable, expectedContent);
  });
});
