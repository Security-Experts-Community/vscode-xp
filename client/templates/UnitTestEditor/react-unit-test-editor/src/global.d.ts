import { Children, DOMAttributes } from 'react';
import {
    VscodeBadge,
    VscodeButton,
    VscodeCheckbox,
    VscodeCheckboxGroup,
    VscodeCollapsible,
    VscodeContextMenu,
    VscodeContextMenuItem,
    VscodeFormContainer,
    VscodeFormGroup,
    VscodeFormHelper,
    VscodeIcon,
    VscodeLabel,
    VscodeMultiSelect,
    VscodeOption,
    VscodeRadio,
    VscodeRadioGroup,
    VscodeScrollable,
    VscodeSingleSelect,
    VscodeSplitLayout,
    VscodeTabHeader,
    VscodeTable,
    VscodeTableBody,
    VscodeTableCell,
    VscodeTableHeader,
    VscodeTableHeaderCell,
    VscodeTableRow,
    VscodeTabPanel,
    VscodeTabs,
    VscodeTextarea,
    VscodeTextfield,
    VscodeTree,
} from '@bendera/vscode-webview-elements';

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: Children }>;

declare global {
    namespace React.JSX {
        interface IntrinsicElements {
            ['vscode-badge']: CustomElement<VscodeBadge>;
            ['vscode-button']: CustomElement<VscodeButton>;
            ['vscode-checkbox']: CustomElement<VscodeCheckbox>;
            ['vscode-checkbox-group']: CustomElement<VscodeCheckboxGroup>;
            ['vscode-collapsible']: CustomElement<VscodeCollapsible>;
            ['vscode-context-menu']: CustomElement<VscodeContextMenu>;
            ['vscode-context-menu-item']: CustomElement<VscodeContextMenuItem>;
            ['vscode-form-container']: CustomElement<VscodeFormContainer>;
            ['vscode-form-group']: CustomElement<VscodeFormGroup>;
            ['vscode-form-helper']: CustomElement<VscodeFormHelper>;
            ['vscode-icon']: CustomElement<VscodeIcon>;
            ['vscode-label']: CustomElement<VscodeLabel>;
            ['vscode-multi-select']: CustomElement<VscodeMultiSelect>;
            ['vscode-option']: CustomElement<VscodeOption>;
            ['vscode-radio']: CustomElement<VscodeRadio>;
            ['vscode-radio-group']: CustomElement<VscodeRadioGroup>;
            ['vscode-scrollable']: CustomElement<VscodeScrollable>;
            ['vscode-single-select']: CustomElement<VscodeSingleSelect>;
            ['vscode-split-layout']: CustomElement<VscodeSplitLayout>;
            ['vscode-tab-header']: CustomElement<VscodeTabHeader>;
            ['vscode-tab-panel']: CustomElement<VscodeTabPanel>;
            ['vscode-table']: CustomElement<VscodeTable>;
            ['vscode-table-body']: CustomElement<VscodeTableBody>;
            ['vscode-table-cell']: CustomElement<VscodeTableCell>;
            ['vscode-table-header']: CustomElement<VscodeTableHeader>;
            ['vscode-table-header-cell']: CustomElement<VscodeTableHeaderCell>;
            ['vscode-table-row']: CustomElement<VscodeTableRow>;
            ['vscode-tabs']: CustomElement<VscodeTabs>;
            ['vscode-textarea']: CustomElement<VscodeTextarea>;
            ['vscode-textfield']: CustomElement<VscodeTextfield>;
            ['vscode-tree']: CustomElement<VscodeTree>;
        }
    }
}
