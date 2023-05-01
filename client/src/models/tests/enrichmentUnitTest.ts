import * as path from "path";
import * as fs from 'fs';

import { UnitTestContentEditorViewProvider } from '../../views/unitTestEditor/unitTestEditorViewProvider';
import { BaseUnitTest } from './baseUnitTest';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { Correlation } from '../content/correlation';
import { XpException } from '../xpException';
import { Enrichment } from '../content/enrichment';
import { CorrelationUnitTest } from './correlationUnitTest';

export class EnrichmentUnitTest extends CorrelationUnitTest {

}