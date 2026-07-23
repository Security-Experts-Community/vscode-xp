import * as assert from 'assert';

import { DockerToolRunner, ToolRunnerFactory } from '../../tools/toolRunner';

suite('ToolRunnerFactory', () => {
  test('uses explicit local mode', () => {
    assert.strictEqual(ToolRunnerFactory.resolveMode('local'), 'local');
  });

  test('uses explicit docker mode', () => {
    assert.strictEqual(ToolRunnerFactory.resolveMode('docker'), 'docker');
  });
});

suite('DockerToolRunner', () => {
  test('builds docker exec arguments without shell command string', () => {
    const runner = new DockerToolRunner({
      containerName: 'xp-kbt',
      workspaceHostPath: '/Users/alice/Work/knowledgebase',
      workspaceContainerPath: '/workspaces/knowledgebase',
      kbtBaseDirectory: '/opt/xp-kbt'
    });

    assert.deepStrictEqual(
      runner.buildDockerExecArgs(
        'xp-kbt',
        '/opt/xp-kbt/extra-tools/siemj/siemj',
        ['-c', '/workspaces/knowledgebase/tmp/xp-output/siemj.conf', 'main'],
        { cwd: '/Users/alice/Work/knowledgebase' }
      ),
      [
        'exec',
        '-i',
        '-w',
        '/workspaces/knowledgebase',
        'xp-kbt',
        '/opt/xp-kbt/extra-tools/siemj/siemj',
        '-c',
        '/workspaces/knowledgebase/tmp/xp-output/siemj.conf',
        'main'
      ]
    );
  });

  test('propagates env vars with host->container path translation', () => {
    const runner = new DockerToolRunner({
      containerName: 'xp-kbt',
      workspaceHostPath: '/Users/alice/Work/knowledgebase',
      workspaceContainerPath: '/workspaces/knowledgebase',
      kbtBaseDirectory: '/opt/xp-kbt'
    });

    assert.deepStrictEqual(
      runner.buildDockerExecArgs('xp-kbt', '/opt/xp-kbt/build-tools/normalize', ['-s', 'formula.xp'], {
        env: {
          PTSIEM_SDK_ROOT: '/Users/alice/Work/knowledgebase/sdk',
          NON_PATH_VALUE: 'trace'
        }
      }),
      [
        'exec',
        '-i',
        '-e',
        'PTSIEM_SDK_ROOT=/workspaces/knowledgebase/sdk',
        '-e',
        'NON_PATH_VALUE=trace',
        'xp-kbt',
        '/opt/xp-kbt/build-tools/normalize',
        '-s',
        'formula.xp'
      ]
    );
  });

  test('translates host paths inside config text via the path mapper', () => {
    const runner = new DockerToolRunner({
      containerName: 'xp-kbt',
      workspaceHostPath: '/Users/alice/Work/knowledgebase',
      workspaceContainerPath: '/workspaces/knowledgebase'
    });

    const configContent = [
      '[normalize]',
      'formula=/Users/alice/Work/knowledgebase/packages/demo/formula.xp',
      'out=/Users/alice/Work/knowledgebase/tmp/xp-output/norm.json'
    ].join('\n');

    assert.strictEqual(
      runner.getPathMapper().mapText(configContent),
      [
        '[normalize]',
        'formula=/workspaces/knowledgebase/packages/demo/formula.xp',
        'out=/workspaces/knowledgebase/tmp/xp-output/norm.json'
      ].join('\n')
    );
  });
});
