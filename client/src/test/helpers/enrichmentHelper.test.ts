import * as assert from 'assert';
import { ContentHelper } from '../../helpers/contentHelper';

suite('EnrichmentHelper', async () => {
  test('Переименование простого обогащения', async () => {
    const ruleCode = `event Sandbox_event:
filter {
	filter::NotFromCorrelator()
	and event_src.vendor == "vendor"
	and event_src.title == "multiscanner"
	and recv_ipv4 != null
	and chain_id != null
}

enrichment External_link_to_Sandbox
enrich Sandbox_event:
	enrich_fields {
		external_link = "https://" + recv_ipv4 + "/tasks-v2/" + chain_id
	}
`;

    const expectedRuleCode = `event Sandbox_event:
filter {
	filter::NotFromCorrelator()
	and event_src.vendor == "vendor"
	and event_src.title == "multiscanner"
	and recv_ipv4 != null
	and chain_id != null
}

enrichment Super_Duper_Enrichment
enrich Sandbox_event:
	enrich_fields {
		external_link = "https://" + recv_ipv4 + "/tasks-v2/" + chain_id
	}
`;

    const newRuleCode = ContentHelper.replaceAllEnrichmentNameWithinCode(
      'Super_Duper_Enrichment',
      ruleCode
    );

    assert.strictEqual(newRuleCode, expectedRuleCode);
  });
});
