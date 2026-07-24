import * as assert from 'assert';

import { PathMapper } from '../../tools/pathMapper';

suite('PathMapper', () => {
  test('maps host paths to container paths', () => {
    const mapper = new PathMapper({
      workspaceHostPath: '/Users/alice/Work/knowledgebase',
      workspaceContainerPath: '/workspaces/knowledgebase'
    });

    assert.strictEqual(
      mapper.hostToContainer('/Users/alice/Work/knowledgebase/packages/demo/rule.co'),
      '/workspaces/knowledgebase/packages/demo/rule.co'
    );
  });

  test('maps container paths to host paths', () => {
    const mapper = new PathMapper({
      workspaceHostPath: '/Users/alice/Work/knowledgebase',
      workspaceContainerPath: '/workspaces/knowledgebase'
    });

    assert.strictEqual(
      mapper.containerToHost('/workspaces/knowledgebase/packages/demo/rule.co'),
      '/Users/alice/Work/knowledgebase/packages/demo/rule.co'
    );
  });

  test('maps --name=/path arguments', () => {
    const mapper = new PathMapper({
      workspaceHostPath: '/Users/alice/Work/knowledgebase',
      workspaceContainerPath: '/workspaces/knowledgebase'
    });

    assert.strictEqual(
      mapper.mapCommandArgument('--schema=/Users/alice/Work/knowledgebase/tmp/xp-output/schema.json'),
      '--schema=/workspaces/knowledgebase/tmp/xp-output/schema.json'
    );
  });

  test('does not map non-path command arguments', () => {
    const mapper = new PathMapper({
      workspaceHostPath: '/Users/alice/Work/knowledgebase',
      workspaceContainerPath: '/workspaces/knowledgebase'
    });

    assert.strictEqual(mapper.mapCommandArgument('main'), 'main');
    assert.strictEqual(mapper.mapCommandArgument('--lang'), '--lang');
  });

  test('reports missing mapping', () => {
    const mapper = new PathMapper({});
    const validation = mapper.validateMapping();

    assert.strictEqual(validation.isValid, false);
    assert.ok(validation.message.includes('workspaceHostPath'));
  });
});
