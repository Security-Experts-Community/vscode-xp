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
});
