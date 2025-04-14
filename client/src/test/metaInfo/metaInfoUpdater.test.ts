import * as assert from 'assert';

import { MetaInfo } from '../../models/metaInfo/metaInfo';
import { MetaInfoUpdater } from '../../views/metaInfo/metaInfoUpdater';

suite('MetaInfoUpdater', () => {
  test('Одна тактика Attack', () => {
    const metaInfoUpdater = new MetaInfoUpdater();
    const metaInfo = new MetaInfo();
    const newMetaInfo = {
      ATTACK: [
        {
          Tactic: 'lateral_movement',
          Techniques: ['T1080']
        }
      ]
    };

    metaInfoUpdater.update(metaInfo, newMetaInfo);

    const attacks = metaInfo.getAttacks();
    assert.strictEqual(attacks.length, 1);
    assert.strictEqual(attacks[0].Tactic, 'lateral_movement');
    assert.deepStrictEqual(attacks[0].Techniques, ['T1080']);
  });

  test('Несколько тактик в Attack', () => {
    const metaInfoUpdater = new MetaInfoUpdater();
    const metaInfo = new MetaInfo();
    const newMetaInfo = {
      ATTACK: [
        {
          Tactic: 'lateral_movement',
          Techniques: ['T1080', 'T1080.11']
        }
      ]
    };

    metaInfoUpdater.update(metaInfo, newMetaInfo);

    const attacks = metaInfo.getAttacks();
    assert.strictEqual(attacks.length, 1);
    assert.strictEqual(attacks[0].Tactic, 'lateral_movement');
    assert.deepStrictEqual(attacks[0].Techniques, ['T1080', 'T1080.11']);
  });

  test('Один *nix провайдеров в DataSouce', () => {
    const metaInfoUpdater = new MetaInfoUpdater();
    const metaInfo = new MetaInfo();
    const newMetaInfo = {
      DataSources: [
        {
          Provider: 'Unix',
          EventID: ['pt_siem_execve', 'pt_siem_execve_daemon', 'user_cmd']
        }
      ]
    };

    metaInfoUpdater.update(metaInfo, newMetaInfo);

    const dataSources = metaInfo.getDataSources();
    assert.strictEqual(dataSources.length, 1);

    const firstDataSource = dataSources[0];
    assert.strictEqual(firstDataSource.Provider, 'Unix');
    assert.strictEqual(firstDataSource.EventID.length, 3);
    assert.deepStrictEqual(dataSources[0].EventID, [
      'pt_siem_execve',
      'pt_siem_execve_daemon',
      'user_cmd'
    ]);
  });

  test('Несколько Windows провайдеров в DataSouce', () => {
    const metaInfoUpdater = new MetaInfoUpdater();
    const metaInfo = new MetaInfo();
    const newMetaInfo = {
      DataSources: [
        {
          Provider: 'Microsoft-Windows-Security-Auditing',
          EventID: [5145]
        },
        {
          Provider: 'Microsoft-Windows-Sysmon',
          EventID: [11]
        }
      ]
    };

    metaInfoUpdater.update(metaInfo, newMetaInfo);

    const dataSources = metaInfo.getDataSources();
    assert.strictEqual(dataSources.length, 2);
    assert.strictEqual(dataSources[0].Provider, 'Microsoft-Windows-Security-Auditing');
    assert.strictEqual(dataSources[1].Provider, 'Microsoft-Windows-Sysmon');

    assert.strictEqual(dataSources[0].EventID.length, 1);
    assert.deepStrictEqual(dataSources[0].EventID, [5145]);

    assert.strictEqual(dataSources[1].EventID.length, 1);
    assert.deepStrictEqual(dataSources[1].EventID, [11]);
  });

  test('Один ID в Windows DataSouce', () => {
    const metaInfoUpdater = new MetaInfoUpdater();
    const metaInfo = new MetaInfo();
    const newMetaInfo = {
      DataSources: [
        {
          Provider: 'Microsoft-Windows-Security-Auditing',
          EventID: [123]
        }
      ]
    };

    metaInfoUpdater.update(metaInfo, newMetaInfo);

    const dataSources = metaInfo.getDataSources();
    assert.strictEqual(dataSources.length, 1);
    assert.strictEqual(dataSources[0].Provider, 'Microsoft-Windows-Security-Auditing');

    assert.strictEqual(dataSources[0].EventID.length, 1);
    assert.deepStrictEqual(dataSources[0].EventID, [123]);
  });

  test('Список ID в DataSouces', () => {
    const metaInfoUpdater = new MetaInfoUpdater();
    const metaInfo = new MetaInfo();
    const newMetaInfo = {
      DataSources: [
        {
          Provider: 'Microsoft-Windows-Security-Auditing',
          EventID: [123, 321]
        }
      ]
    };

    metaInfoUpdater.update(metaInfo, newMetaInfo);

    const dataSources = metaInfo.getDataSources();
    assert.strictEqual(dataSources.length, 1);
    assert.strictEqual(dataSources[0].Provider, 'Microsoft-Windows-Security-Auditing');

    assert.strictEqual(dataSources[0].EventID.length, 2);
    assert.deepStrictEqual(dataSources[0].EventID, [123, 321]);
  });
});
