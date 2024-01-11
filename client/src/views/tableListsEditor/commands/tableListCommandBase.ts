import { TableListType } from '../../../models/content/table';
import { TableListsEditorViewProvider } from '../tableListsEditorViewProvider';

export class TableListMessage {
	command: string;
	data?: string;
}

export interface TableFieldView {
	index: boolean;
	nullable: boolean,
	primaryKey: boolean,
	type: string,
	unique: boolean,
	compositeFields: string[];
}

export interface TableView {
	name: string;
	fillType: TableListType;
	type: number;
	maxSize: number|undefined;
	typicalSize: number|undefined
	userCanEditContent: boolean;
	fields: any [];
	metainfo: {
		ruDescription: string;	
		enDescription: string;
		objectId: string;
	},
	defaults: any;
}

export interface TableListCommand {
	processMessage(message: any): void;
	execute(webView: TableListsEditorViewProvider): Promise<boolean>;
}