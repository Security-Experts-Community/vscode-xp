// Types for communication between extension and webviews

import { MetaInfoDto, TableListDto, UnitTest, UnitTestsDto } from '.';

/**
 * Messages webview pages send to the extension
 */
export type RequestMessage =
  // Shared commands between all pages
  | { command: 'documentIsReady' }

  // Unit Test Editor
  | {
      command: 'UnitTestEditor.saveAllTests';
      payload: {
        tests: UnitTest[];
      };
    }
  | {
      command: 'UnitTestEditor.runAllTests';
      payload: {
        tests: UnitTest[];
      };
    }
  | {
      command: 'UnitTestEditor.runTest';
      payload: {
        testNumber: number;
        tests: UnitTest[];
      };
    }
  | {
      command: 'UnitTestEditor.updateExpectation';
      payload: {
        testNumber: number;
      };
    }

  // Table List Editor
  | { command: 'TableListEditor.saveTableList'; payload: TableListDto }

  // Meta Info Editor
  | { command: 'MetaInfoEditor.saveMetaInfo'; payload: MetaInfoDto }
  | { command: 'MetaInfoEditor.openFileByObjectId'; payload: { objectId: string } };

/**
 * Messages the extension sends to the webview pages
 */
export type ResponseMessage =
  // Any message
  | ({ command: '*' } & Record<string, unknown>)

  // Unit Test Editor
  | { command: 'UnitTestEditor.setState'; payload: UnitTestsDto }
  | {
      command: 'UnitTestEditor.updateTest';
      payload: Partial<UnitTest> & Required<Pick<UnitTest, 'testNumber'>>;
    }

  // Table List Editor
  | { command: 'TableListEditor.setState'; payload: TableListDto }
  | { command: 'TableListEditor.saveTableList' }

  // Meta Info Editor
  | { command: 'MetaInfoEditor.setState'; payload: { metaInfo: MetaInfoDto; author: string } };
