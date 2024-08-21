# Change Log

## 3.19.0 (Pre-Release)

- fixed the error of replacing the expected event actually in integration tests (special thanks @Bobyboba18, @GeorgeFloyd_Official).

## 3.18.1 (Release - August 21, 2024)

- fixed the error of replacing the expected event actually in integration tests (special thanks @Bobyboba18, @GeorgeFloyd_Official).

## 3.18.0 (Release - July 31, 2024)

- added basic support for aggregation rules: creation from a template, testing, filling in meta information, validation through tests, description and localization (special thanks @Protenil, @hiddenbymeeee);
- extended localization verification in terms of embedding taxonomic fields (special thanks @Protenil).
- added the ability to automatically update the integration test window when they change files on disk (a request appears to the user), as well as a suggestion to close the window if the rule is deleted;
- added the ability to view actual events in integration tests without updating the expected event (special thanks @iddqdidkfa);
- added the function of opening an unlimited number of metadata editors (special thanks @DuckDarkwing, @iddqdidkfa, @FedosovaOA, @Bobyboba18, @g4n8g and others).
- added checking for required fields in the correlation event when running integration tests;
- enhanced verification of the integration test code for the presence of at least one `expect 1 { check...}` or `expect table_list {...}` (special thanks @UncleSStepa);
- added rule templates for macOS: MacOS_ProcessExecution and MacOS_FileCreate;
- expanded the number of enrichment rule templates and added comments to the code and tests (special thanks @DedInside_BA);
- fixed bugs and improved stability (special thanks @g4n8g, @DuckDarkwing, @paran0id_34, @jjack_the_reaper and others);
- improved localization (special thanks @feelstacy, @eugzolotukhin).

## 3.17.20 (Pre-Release)

- extended localization verification in terms of embedding taxonomic fields (special thanks @Protenil).

## 3.17.19 (Pre-Release)

- improved localization (special thanks @feelstacy, @eugzolotukhin);
- unified logic for checking the availability of KBT and individual utilities.

## 3.17.18 (Pre-Release)

- improved localization of the integration test integrity error message (special thanks @Bobyboba18);
- improved English localization of the interface and messages (special thanks @feelstacy).

## 3.17.17 (Pre-Release)

- improved feature for detecting changes to integration test files (special thanks @Bobyboba18).

## 3.17.16 (Pre-Release)

- Microsoft-Windows-Bits-Client provider has been added to fill in meta information (special thanks @d3f0x0).

## 3.17.15 (Pre-Release)

- improved localization (special thanks @feelstacy, @eugzolotukhin);
- improved feature for detecting changes to integration test files (special thanks @Bobyboba18).

## 3.17.14 (Pre-Release)

- fixed an error due to which the Problems window did not display information about the unsuccessful assembly of the correlation graph with an empty file rule.co (special thanks @jjack_the_reaper).

## 3.17.13 (Pre-Release)

- added the ability to automatically update the integration test window when they change files on disk (a request appears to the user), as well as a suggestion to close the window if the rule is deleted;
- redesigned the consistency control scheme of the normalization graph via File Watcher for normalization formulas, when correcting the formula, the assembled graph is deleted for recompilation.

## 3.17.12 (Pre-Release)

- expanded localization (special thanks @feelstacy, @eugzolotukhin) and unified the output of warnings when creating content: rules, directories and packages;
- added the ability to rename content directories;
- improved error output when working with integration tests;
- fixed an error updating an expected event with an actual one (special thanks @paran0id_34);
- expanded the number of event sources in the metadata editor (special thanks @driverenok).

## 3.17.11 (Pre-Release)

- The number of enrichment rule templates has been expanded and comments have been added to the code and tests (special thanks @DedInside_BA).

## 3.17.10 (Pre-Release)

- added verification of the correctness of the path to the rule/tests (special thanks @Bobyboba18).

## 3.17.9 (Pre-Release)

- added support for working with [untrusted workspace](https://code.visualstudio.com/docs/editor/workspace-trust) (workspace). In this case, the extension will work, but it will complain about the lack of a git extension, which will slow down the execution of tests/correlation of files and events, and so on.;
- tabs in macOS templates have been replaced with spaces.

## 3.17.8 (Pre-Release)

- Added the ability to view actual events in integration tests without updating the expected event (special thanks @iddqdidkfa).

## 3.17.7 (Pre-Release)

- documentation has been excluded from the extension build, the extension has lost 100 MB.

## 3.17.6 (Pre-Release)

- added rule templates for macOS: MacOS_ProcessExecution and MacOS_FileCreate.

## 3.17.5 (Pre-Release)

- added the ability to open an unlimited number of metadata editors (special thanks @DuckDarkwing, @iddqdidkfa, @FedosovaOA, @Bobyboba18, @g4n8g and others).

## 3.17.4 (Pre-Release)

- fixed an error that was invisible to the user, which was output when an incomplete attempt to open the knowledge base was made.

## 3.17.3 (Pre-Release)

- added checking for required fields in the correlation event when running integration tests.

## 3.17.2 (Pre-Release)

- fixed the bug updating the expected integration test event (special thanks @DuckDarkwing).

## 3.17.1 (Pre-Release)

- fixed an error saving a negative integration test (special thanks @g4n8g).

## 3.17.0 (Pre-Release)

- enhanced verification of the integration test code for the presence of at least one `expect 1 { check...}` or `expect table_list {...}` (special thanks @UncleSStepa);
- added basic support for aggregation rules: creation from a template, testing, filling in meta information, validation through tests, description and localization (special thanks @Protenil, @hiddenbymeeee);
- improved localization (special thanks @feelstacy, @eugzolotukhin);
- added a check for missing rule descriptions (special thanks @UncleSStepa).

## 3.16.0 (Release - June 9, 2024)

- feature [#123](https://github.com/Security-Experts-Community/vscode-xp/issues/123) - checking objects with optimization of artifact assembly, which significantly increased the speed of its execution;
- feature [#144](https://github.com/Security-Experts-Community/vscode-xp/issues/144) - individual localization check for normalization rules in the localization editor (special thanks @laaral-home);
- feature [#195](https://github.com/Security-Experts-Community/vscode-xp/issues/195) - added the ability to correlate EVTX files on Linux (special thanks @anfinogenov);
- added the Getting Started section on [русском](https://github.com/Security-Experts-Community/vscode-xp/blob/develop/docs/GETTING_STARTED.md ) and [English](https://github.com/Security-Experts-Community/vscode-xp/blob/develop/docs/GETTING_STARTED_EN.md) languages for basic cases of working with extensions and content (special thanks @Yulia17_00, @GenRockeR);
- improved localization in Russian and English (special thanks @DuckDarkwing, @feelstacy, @eugzolotukhin);
- added conversion of new lines of expertise when unpacking a KB package for the current system, which reduces the number of minor changes in git (special thanks @hiddenbymeeee);
- implemented verification of the correctness of the path (only Latin letters, numbers and characters allowed for the path) to the rule when running normalization tests and the output directory (special thanks @iatrofimenko);
- added saving the test status when saving them in the integration test editor if neither the raw events nor the test code have changed;
- enhanced capabilities for testing the rules of enrichment of correlation rules (special thanks @g4n8g);
- extended logging;
- added the ability to avoid manually setting the output directory, it is generated automatically;
- fixed bugs and improved stability.

## 3.15.14 (Pre-Release)

- improved English localization for VSCode style (special thanks @DuckDarkwing);
- added conversion of new lines of expertise when unpacking a KB package for the current system, which reduces the number of minor changes in git (special thanks @hiddenbymeeee).

## 3.15.13 (Pre-Release)

- fixed the missing content validation button from the context menu.

## 3.15.12 (Pre-Release)

- added saving comments to the metadata file (special thanks @zatraahali);
- improved localization (special thanks @feelstacy, @eugzolotukhin);
- added localization build errors to the Problems section of VSCode;
- all content creation commands have been moved to the general Create submenu.

## 3.15.11 (Pre-Release)

- added the ability to select individual directories for adding EVTX files;
- the feature with localization testing during content validation has been returned;
- added auto-completion for the incident category field _incident.category_;
- implemented verification of the correctness of the path (only Latin letters, numbers and characters allowed for the path) to the rule when running normalization tests and the output directory (special thanks @iatrofimenko);
- added a check of the localizations of all the directories that are running for validation. Verification starts after validation of all rules (special thanks @iatrofimenko);
- fixed an error when displaying the name of a rule in which integration tests were not detected (special thanks @jjack_the_reaper).

## 3.15.10 (Pre-Release)

- incorrect localization of the normalization and enrichment status of the raw event has been fixed (special thanks @g4n8g);
- improved localization (special thanks @feelstacy, @eugzolotukhin).

## 3.15.9 (Pre-Release)

- fixes for the mass check function of localizations of normalizations;
- fixed saving additional data when editing metadata.

## 3.15.8 (Pre-Release)

- PoC features [#144](https://github.com/Security-Experts-Community/vscode-xp/issues/144) - individual localization check for normalization rules in the localization editor (special thanks @laaral-home).

## 3.15.7 (Pre-Release)

- the \_rule, \_objects fields are completely excluded from the comparison of expected and actual events;
- the test status is saved in the integration test editor after a massive rule check in the content tree;
- added saving the test status when saving them in the integration test editor if neither the raw events nor the test code have changed;
- the ability to run localization testing while executing similar commands from other windows is limited.

## 3.15.6 (Pre-Release)

- improved the logic of enrichment testing;
- added the [Getting section Started](https://github.com/Security-Experts-Community/vscode-xp/blob/develop/docs/GETTING_STARTED.md) with gifs on basic cases of working with extensions and content (special thanks @Yulia17_00, @GenRockeR);
- added the ability to test individual rules in the object tree;
- improved localization.

## 3.15.5 (Pre-Release)

- enhanced capabilities for testing the rules of enrichment of correlation rules (special thanks @g4n8g).

## 3.15.4 (Pre-Release)

- added resetting the status of rules when checking objects in the tree;
- fixed an error deleting integration tests (special thanks @g4n8g).

## 3.15.3 (Pre-Release)

- fixed an error displaying the rule description in the tree, which led to problems visualizing the object tree (special thanks @sanguis_meus, @dushnyaga);
- improved localization (special thanks @feelstacy, @eugzolotukhin).

## 3.15.2 (Pre-Release)

- implemented feature [#195](https://github.com/Security-Experts-Community/vscode-xp/issues/195) - added the ability to correlate EVTX files on Linux;
- fixed the error of localization of events on Linux;
- Improved localization for unsupported languages.

## 3.15.1 (Pre-Release)

- feature implemented [#123](https://github.com/Security-Experts-Community/vscode-xp/issues/123) - checking objects with optimization of artifact assembly, which significantly increased the speed of its execution;
- added output of the extension version to the console;
- added the ability to avoid manually setting the output directory, it is generated automatically;
- localization verification is disabled during mass rule testing, as the siemkb_test crashes.

## 3.14.4 (Release)

- Localization checking is temporarily disabled when checking objects in the tree in bulk.

## 3.14.3 (Release)

- fixed the error of disappearing integration tests when saving with incorrect test code (special thanks @Bobyboba18, @mukharlyamoff).

## 3.14.2 (Release)

- fixed an error checking the localization of the correlation rule.

## 3.14.1 (Release)

- unnecessary libraries are excluded.

## 3.14.0 (Release - April 16, 2024)

- feature implemented [#139](https://github.com/Security-Experts-Community/vscode-xp/issues/139) - the ability to prematurely stop _normalize and _normalize and enrich_ actions in integration tests (special thanks @g4n8g), as well as the ability to interrupt compilation of localizations, normalizations and WLD files;
- improved correlation rule templates (special thanks @g4n8g);
- added [Industrial Control System (ICS)](https://attack.mitre.org/matrices/ics/) tactics in the meta information editor (special thanks @g4n8g);
- feature implemented [#179](https://github.com/Security-Experts-Community/vscode-xp/issues/179) - the ability to specify a supplier when packaging content in a KB file;
- added feature [#181](https://github.com/Security-Experts-Community/vscode-xp/issues/181) - editing the filling of the table list of the type _Pravochnik_ with default values (special thanks @aw350m3);
- increased the maximum amount of EVTX files that can be used for correlation;
- added the command to open the extension settings and console output to the additional list of commands (... in the UI) of the object tree;
- added localization of the description of taxonomy fields and functions in English for auto-completion and hover, depending on the selected VSCode language;
- improved Russian and English localization of extension windows (special thanks @feelstacy, @eugzolotukhin);
- Bug fixes, improved stability and friendliness (special thanks @r0m_kaCh, @FedosovaOA, @g4n8g, @iddqdidkfa, @paran0id_34, @nevermihcdfjndsxj and many others).

## 3.13.24 (Pre-Release)

- added a check to open the knowledge base when running the _tree object commands_;
- fixed a bug checking default localizations;
- improved localization (special thanks @feelstacy, @eugzolotukhin).

## 3.13.23 (Pre-Release)

- expanded the maximum amount of EVTX files that can be used for correlation;
- added logging settings for the extension;
- localized extension settings in English.

## 3.13.22 (Pre-Release)

- fixed an error converting an xml event copied from Windows Event Viewer (special thanks @nevermihcdfjndsxj).

## 3.13.21 (Pre-Release)

- fixed JSON formatting and compression errors in raw events and test code (special thanks @paran0id_34);
- improved comparison of expected and actual events in integration tests (special thanks @aw350m3);
- feature implemented [#139](https://github.com/Security-Experts-Community/vscode-xp/issues/139) - the possibility of prematurely stopping the action of Normalize and Normalize and enrich in integration tests (special thanks @g4n8g).

## 3.13.20 (Pre-Release)

- improved Russian and English localization (special thanks @feelstacy, @eugzolotukhin);
- added output of information about the current OS when initializing the extension (special thanks @dushnyaga).

## 3.13.19 (Pre-Release)

- added a description of the functions to the autocomplete list;
- fixed the error of looping the search for auxiliary rules when running integration tests (special thanks @g4n8g).

## 3.13.18 (Pre-Release)

- added the command to open the extension settings to the additional list of commands (... in the UI) of the object tree;
- added localization of the description of taxonomy fields and functions in English.

## 3.13.17 (Pre-Release)

- fixed the error of creating a knowledge base in an empty directory (special thanks @r0m_kaCh).

## 3.13.16 (Pre-Release)

- added the command to open the extension output to the additional list of commands (... in the UI) of the object tree;
- added a command to automatically open the extension output in errors where you need to familiarize yourself with this output;
- updated correlation rule templates (special thanks @g4n8g);
- improved Russian and English localization (special thanks @feelstacy, @eugzolotukhin).

## 3.13.15 (Pre-Release)

- fixed the button for opening the knowledge base in the welcome message;
- fixed the error of losing `ContentLabels` after saving metadata (special thanks @paran0id_34).

## 3.13.14 (Pre-Release)

- added useful examples for the `join` and `remove` functions (special thanks @zBlur);
- the possibility of simultaneous launch of the assembly of artifacts: graphs and tabular lists, localizations, normalizations and wld files is excluded;
- added the ability to interrupt compilation of localizations, normalizations and wld files with information;
- the compilation status of various artifacts is localized into English;
- incorrect syntax highlighting of js files has been eliminated when the extension is installed (special thanks @iddqdidkfa).

## 3.13.13 (Pre-Release)

- the `table_list default` construct (loads the default fillings for all directories) has been added to all integration tests of all correlation rule templates and is automatically added when creating a new integration test;
- improved Russian and English localization (special thanks @feelstacy, @eugzolotukhin).

## 3.13.12 (Pre-Release)

- improved Russian localization (special thanks @feelstacy, @eugzolotukhin);
- added ICS tactics to the meta information editor (special thanks @g4n8g);
- added highlighting of function calls in their pop-up description;
- improved informing the user about the necessary settings at the first launch.

## 3.13.11 (Pre-Release)

- added validation of the correctness of filling in the default values of tabular lists (special thanks @aw350m3);
- fixed an error when adding an envelope to an xml event when copying from EventViewer;
- improved Russian localization (special thanks @feelstacy).

## 3.13.10 (Pre-Release)

- improved the UI of the editing window for filling in a table list of the _Pravochnik_ type with default values (special thanks @aw350m3);
- unnecessary context menu items for macros and the root of the knowledge base are excluded;
- improved Russian localization.

## 3.13.9 (Pre-Release)

- fixed an error deleting meta information fields (special thanks @g4n8g).

## 3.13.8 (Pre-Release)

- fixed an error unpacking a kb file with content without expertise packages (special thanks @FedosovaOA);
- improved localization.

## 3.13.7 (Pre-Release)

- added the ability to search in the default tabular lists of the _special_ type (special thanks @g4n8g).

## 3.13.6 (Pre-Release)

- the display of the default values window when viewing changes via git in _VSCode_ has been eliminated, the text comparison of the table list file before and after editing is now displayed again (special thanks @g4n8g);
- when you click on a tabular list, its structure editor is immediately displayed;
- to edit the default values of the table list (only for the Reference Book), now you need to use the context menu item _Default values_ (Default values).

## 3.13.5 (Pre-Release)

- fixed an error validating the content prefix and ObjectId of the package.

## 3.13.4 (Pre-Release)

- feature implemented [#179](https://github.com/Security-Experts-Community/vscode-xp/issues/179) - the ability to specify the supplier when packaging content in a kb file;
- added feature [#181](https://github.com/Security-Experts-Community/vscode-xp/issues/181) - editing the filling of the table list of the Directory type with default values (special thanks @aw350m3);
- fixed a package compilation error with a shortened path (with a tilde) to the user's home directory (special thanks @r0m_kaCh);
- localized into English windows for creating rules based on a template;
- fixed bugs and improved stability.

## 3.13.3 (Pre-Release)

- fixed an error saving localizations.

## 3.13.2 (Pre-Release)

- added the ability to read its localized name from metadata instead of the name when unpacking a package (special thanks @r0m_kaCh).

## 3.13.1 (Pre-Release)

- added feature [#112](https://github.com/Security-Experts-Community/vscode-xp/issues/112) - creating macros.

## 3.13.0 (Pre-Release)

- feature implemented [#81](https://github.com/Security-Experts-Community/vscode-xp/issues/81) - partial verification of filling in the fields to be checked in unit tests (special thanks @Ideas4Life);
- added default field values when creating tabular lists: maximum and typical size, recording time (special thanks @antonmantsurov);
- fixed double insertion of a newline character when editing integration tests (special thanks @antonmantsurov);
- added feature [#167](https://github.com/Security-Experts-Community/vscode-xp/issues/167) - the ability to run a mass check of normalization rules;
- added the ability to edit the macro description.

## 3.12.0 (Release)

- feature implemented [#171](https://github.com/Security-Experts-Community/vscode-xp/issues/171) - description of the functions and fields of the taxonomy when hovering over them with the mouse;
- the addition of English language support has begun (special thanks @DuckDarkwing);
- added automatic saving when updating an expected and raw event in unit tests with test re-run (special thanks @zatraahali);
- implemented feature [#156](https://github.com/Security-Experts-Community/vscode-xp/issues/156) - creating and editing the structure of tabular lists (special thanks @iam_bdoxhn);
- added support for nesting subrules of arbitrary depth (special thanks @bstvld);
- added a binary module (source code [here](https://github.com/Security-Experts-Community/rust-evtx-convert)) to convert evtx files to the desired format (special thanks @anfinogenov);
- added the ability to rebuild the normalization graph (Content Tree → ... → Compile all normalizations);
- the normalization and correlation unit test window has been completely redesigned (special thanks @iam_bdoxhn);
- added function [#145](https://github.com/Security-Experts-Community/vscode-xp/issues/145 ) duplication of the correlation rule (special thanks @g4n8g).

## 3.11.19 (Pre-Release)

- added the ability to use new lines in the description of rules and tabular lists;
- added the ability to add descriptions for tabular lists.

## 3.11.18 (Pre-Release)

- added function [#145](https://github.com/Security-Experts-Community/vscode-xp/issues/145) duplication of the correlation rule (special thanks @g4n8g).

## 3.11.17 (Pre-Release)

- added automatic updating of the table list name in metadata when renaming (special thanks @bobyboba18).

## 3.11.16 (Pre-Release)

- fixed an error renaming an existing table list (special thanks @bobyboba18).

## 3.11.15 (Pre-Release)

- fixed an error in reading the markup of the rules according to the MITRE matrix in the metadata editor;
- fixed the error of creating a tabular list (special thanks @bobyboba18).

## 3.11.14 (Pre-Release)

- the `time` field was returned to the normalization unit tests with an exception from the comparison (special thanks @g4n8g).

## 3.11.13 (Pre-Release)

- localized metadata editor window;
- bug fixed [#176](https://github.com/Security-Experts-Community/vscode-xp/issues/176) creating an empty kb package for some configurations (special thanks @qazws56866)

## 3.11.12 (Pre-Release)

- fixed an error incorrectly saving a raw event in the normalization test (special thanks @bobyboba18).

## 3.11.11 (Pre-Release)

- when generating the ObjectId of a table list, it now takes into account not only its name but also its type, which allows you to avoid errors when installing in PTKB after changing the type of the table list (special thanks @DuckDarkwing);
- the normalization and correlation unit test window has been completely redesigned (special thanks @iam_bdoxhn);
- added the ability to rebuild the normalization graph (Content Tree → ... → Compile all normalizations);
- added a binary module (source code [here](https://github.com/Security-Experts-Community/rust-evtx-convert)) to convert evtx files to the desired format (special thanks @anfinogenov).

## 3.11.10 (Pre-Release)

- the deletion of wld files is excluded when editing the structure of the table list (special thanks @DuckDarkwing);
- the process of meta-information parsing has been accelerated;
- bug fixed [#173](https://github.com/Security-Experts-Community/vscode-xp/issues/173) creating tabular lists filled with correlations and enrichments (special thanks @Ideas4Life).

## 3.11.9 (Pre-Release)

- added support for nesting subrules of arbitrary depth (special thanks @bstvld);
- fixed the error of adding list fields in meta information (special thanks @aw350m3, @g4n8g).

## 3.11.8 (Pre-Release)

- fixed the error of getting the expected event in integration tests (special thanks @g4n8g).

## 3.11.7 (Pre-Release)

- implemented PoC features [#156](https://github.com/Security-Experts-Community/vscode-xp/issues/156) - creating and editing the structure of tabular lists (special thanks @iam_bdoxhn);
- added the ability to explicitly not compile correlations during the integration testing of enrichment (special thanks @bobyboba18, @r0m_kaCh);
- the interface of integration tests is localized.

## 3.11.6 (Pre-Release)

- fixed a bug in the formation of a content tree (special thanks @r0m_kaCh, @FedosovaOA).
- implemented feature [#170](https://github.com/Security-Experts-Community/vscode-xp/issues/170) the `time` field has been added to the correlation event.

## 3.11.5 (Pre-Release)

- localization extension in English (special thanks @DuckDarkwing);
- fixed bugs for content without tabular lists (special thanks @r0m_kaCh).

## 3.11.4 (Pre-Release)

- added automatic saving of the raw event before running the unit test (special thanks @zatraahali);
- added automatic saving when updating an expected event in unit tests with test re-run (special thanks @zatraahali);
- when adding a new normalization localization, its criterion is adapted for normalizations (special thanks @zatraahali);
- The addition of English language support has begun.

## 3.11.3 (Pre-Release)

- relaxed the requirements for filling out the description and localization.

## 3.11.2 (Pre-Release)

- fixed the integration test status error;
- feature implemented [#171](https://github.com/Security-Experts-Community/vscode-xp/issues/171) - description of the functions and fields of the taxonomy when hovering over them with the mouse;
- fixed the error of creating enriches from templates (special thanks @skylex11).

## 3.11.1 (Pre-Release)

- updated meta information for enrichment rule templates (special thanks @DuckDarkwing).

## 3.11.0 (Pre-Release)

- updated the Password_Brute correlation rule template;
- fixed an error when generating an expected event, the required `time` field was excluded (special thanks @g4n8g).

## 3.10.0 (Release)

- feature implemented [#133](https://github.com/Security-Experts-Community/vscode-xp/issues/133) to generate an expected event for rules based on subrules;
- added a button to update the expected event with the actual one in unit tests of correlations and normalizations;
- feature implemented [#162](https://github.com/Security-Experts-Community/vscode-xp/issues/162) - collecting all artifacts has been replaced by collecting all graphs without assembling localizations (special thanks to @laaral-home for the case);
- added by separate menu items of the content tree (you need to click on the three dots on the right) the ability to collect all localizations and wld;
- added a check in the localization editor for the presence of default localizations, which is an error;
- implemented feature [#140](https://github.com/Security-Experts-Community/vscode-xp/issues/140) - the function of checking the rules in the selected directory via the `right mouse button on the directory -> Check` for the rules displayed in the tree;
- after passing integration or localization tests, the status of the rule is displayed in the content tree with the necessary description;
- Bug fixes, improved stability and improved user experience.

## 3.9.11 (Pre-Release)

- fixed the error of wrapping events in an envelope.

## 3.9.10 (Pre-Release)

- expanded test event generation cases for enrichment integration tests.

## 3.9.9 (Pre-Release)

- fixed an error generating test localizations (special thanks to @bobyboba18 for the case).

## 3.9.8 (Pre-Release)

- PoC features [#133](https://github.com/Security-Experts-Community/vscode-xp/issues/133) to generate an expected event for rules based on subrules;
- added a button to update the expected event in unit tests, which is very important for testing normalizations. Now you can get the expected event from the actual one with a single keystroke;
- fixed the problem of path formation in EDR mode (special thanks to @aw350m3).

## 3.9.7 (Pre-Release)

- added checking for valid rule names when creating them from a template (special thanks to @bobyboba18 for the case);
- added checking for the return value of utilities from KBT;
- feature [#162](https://github.com/Security-Experts-Community/vscode-xp/issues/162) - collecting all artifacts has been replaced by collecting all graphs without assembling localizations (special thanks to @laaral-home for the case);
- added a separate item in the content tree menu (you need to click on the three dots on the right) the ability to collect all localizations and wld.

## 3.9.6 (Pre-Release)

- bug fixed [#160](https://github.com/Security-Experts-Community/vscode-xp/issues/160) - user content is ignored when unpacking the kb file (thanks to the community comrad);
- improved stability.

## 3.9.5 (Pre-Release)

- after passing integration or localization tests, the status of the rule is displayed in the content tree with the necessary description;
- added a check in the localization editor for the presence of default localizations, which is an error;
- a description of the correlation and enrichment rule appears when you hover over it in the content tree;
- fixed a bug with packaging test events for integration tests (special thanks @g4n8g);
- PoC features [#140](https://github.com/Security-Experts-Community/vscode-xp/issues/140) - the function of checking the rules in the selected directory via the `right mouse button on the directory -> Check` for the rules displayed in the tree;
- if the enrichment works only with normalized events, then the correlation graph is not collected without a confirmation request from the user.

## 3.9.4 (Pre-Release)

- the extension is adapted for KW (bundle of dependent binary utilities) versions 26.0.4369;
- added a notification about the need to install git;
- added automatic reassembly of the normalization graph in the event that changes to at least one normalization formula in git are detected;
- unnecessary updates of localization and meta-information files are excluded;
- Output log overwriting is excluded when starting and opening unit tests.

## 3.9.3 (Pre-Release)

- the hotkeys `Ctrl+Z` and `Ctrl+Y` were returned to the integration test view, which was temporarily excluded in version 3.9.2 (Pre-Release);
- added the `Undo` and `Redo` function when editing the integration test code;
- fixed the lack of error output for unit tests of normalizations (special thanks @r0m_kaCh).

## 3.9.2 (Pre-Release)

- the hotkeys `Ctrl+Z` and `Ctrl+Y` were excluded from the integration test view due to an unexpected error of corruption of the integration test files.

## 3.9.1 (Pre-Release)

- PoC features [#146](https://github.com/Security-Experts-Community/vscode-xp/issues/146) - comparison of actual and expected events in integration tests using the `Compare results` button for failed tests;
- the hotkeys `Ctrl+Z` and `Ctrl+Y` have been returned to the integration test view (special thanks @iam_bdoxhn);
- in integration tests, the `Get expected event` button has been moved closer to the test code for which it is used;
- validation of regular expressions is downgraded in importance to Warning;
- added to the list of MITRE ATT&CK tactics in meta information (special thanks to @paran0id_34).

## 3.8.1 (Release)

- fixed a bug with mixing normalization tests when saving;
- fixed a bug when updating the list of unit tests.

## 3.8.0 (Release)

- feature [#132](https://github.com/Security-Experts-Community/vscode-xp/issues/132) - an increase in the number of test localizations received and an increase in the speed of their generation (special thanks @mmaximov);
- feature [#142](https://github.com/Security-Experts-Community/vscode-xp/issues/142) - added a configurable extension parameter `correlatorTimeout`, which allows you to adjust the timeout of the correlator (special thanks @DuckDarkwing for the case);
- feature [#45](https://github.com/Security-Experts-Community/vscode-xp/issues/45) - now the `contentPrefix` parameter can be cleared and the ObjectId value will not be generated for the created rules (special thanks @zatraahali for the case);
- updated templates and snippets (special thanks @zBlur), added a template (Password_Brute) to create correlation rules for the brute force of an arbitrary service;
- maximized the speed of integration tests and localization checks for knowledge bases of arbitrary size;
- added a request to compile dependent correlations when running integration tests for correlations with subroutines and enrichments;
- added the ability to save integration tests, localizations and meta-information by pressing the combination `CTRL + S'.

## 3.7.8 (Pre-Release)

- feature [#142](https://github.com/Security-Experts-Community/vscode-xp/issues/142) - added a configurable extension parameter `correlatorTimeout`, which allows you to adjust the timeout of the correlator (special thanks @DuckDarkwing for the case);
- feature [#45](https://github.com/Security-Experts-Community/vscode-xp/issues/45) - now the `contentPrefix` parameter can be cleared and the ObjectId value will not be generated for the created rules (special thanks @zatraahali for the case).

## 3.7.7 (Pre-Release)

- localization examples can now be obtained much faster without additional runs of integration tests (special thanks @mmaximov for the idea);
- added the ability to save meta information by pressing the combination `CTRL + S`;
- when receiving the expected event, the Output window is excluded, you can view the received event immediately in the integration tests editor and save it if necessary;
- fixed an error wrapping a raw event in an envelope (special thanks to @bobyboba18 for the case);
- added automatic saving of localizations before getting examples of localizations.

## 3.7.6 (Pre-Release)

- the possibility to check the localization of normalizations has been eliminated, since this functionality has not yet been implemented (special thanks @gautama_s for the case);
- bug fixed [#143](https://github.com/Security-Experts-Community/vscode-xp/issues/143) - the process of exporting and importing KB files hangs in the absence .NET Runtime (special thanks @denisiaka for the case);
- fixed problems with adding/removing tests in the integration test editor (special thanks @iam_bdoxhn);
- an extension initialization error has been eliminated if temporary files cannot be deleted.

## 3.7.5 (Pre-Release)

- improved wording of error messages, added recommendations for their correction;
- bug fixed [#137](https://github.com/Security-Experts-Community/vscode-xp/issues/137) - added a check for generating an expected event for tests with the check `expect not {}` (special thanks @g4n8g);
- added snippets on file access events for Windows and Linux;
- fixed an error in generating examples of localizations and integration tests in rules with multiple use of a single sub-rule.

## 3.7.4 (Pre-Release)

- maximized the speed of integration tests and localization checks for knowledge bases of arbitrary size;
- added the ability to use the keyboard shortcut `CTRL + A` for all fields in integration tests (special thanks @iam_bdoxhn);
- the ability to add and check localizations for enrichment rules is excluded;
- fixed the separation of the markup when checking localizations (special thanks @iam_bdoxhn).

## 3.7.3 (Pre-Release)

- feature [#132](https://github.com/Security-Experts-Community/vscode-xp/issues/132) - increase in the number of test localizations received (special thanks @mmaximov);
- added output of information about the impossibility of receiving the expected event in integration tests for rules using subroules (for example, `correlation_name == "subrule_..."`);
- added a request to compile dependent correlations when running integration tests for correlations with subroutines and enrichments.

## 3.7.2 (Pre-Release)

- concise descriptions of the context menu `Localization Rules Editor` → `Localization`, `Meta Information Editor` → `Meta information`;
- feature [#128](https://github.com/Security-Experts-Community/vscode-xp/issues/128) - a single order of context menu items for correlations and normalizations (special thanks @g4n8g);
- updated templates and snippets (special thanks @zBlur);
- added the ability to save localizations by pressing the combination `CTRL + S'.

## 3.7.1 (Pre-Release)

- feature [#100](https://github.com/Security-Experts-Community/vscode-xp/issues/100) - added the ability to stop the execution of integration tests;
- added a check for the implicit conversion of the Number type (fields `dst.port`, `src.port`, etc.) to the string during concatenation operations (special thanks @DuckDarkwing, @FedosovaOA for the case);
- added a template (Password_Brute) to create correlation rules for the brute force of an arbitrary service.

## 3.7.0 (Pre-Release)

- added notifications to the user if there are problems with parsing correlations and normalizations;
- feature [#127](https://github.com/Security-Experts-Community/vscode-xp/issues/127) - integration and unit tests work for knowledge bases without tabular lists;
- added the ability to save integration tests by pressing the combination `CTRL + S'.

## 3.6.0 (Release)

- feature [#44](https://github.com/Security-Experts-Community/vscode-xp/issues/44) - added code highlighting in integration tests with its update during editing;
- feature [#88](https://github.com/Security-Experts-Community/vscode-xp/issues/88) - adding an envelope to events without an envelope in integration tests;
- added automatic rule selection in the content tree when opening files \*.co,\*.en, \*.xp in Explorer (Activity Bar);
- added snippets for external_src.\*, external_dst.\*, datafield\* and datafieldN;
- added snippets and descriptions for Base64 decoding functions: `decode`, `buffer_from_base64`;
- updated correlation templates `For_Profiling` and `Windows_Logon`;
- fixed bugs and improved stability.

## 3.5.13 (Pre-Release)

- PoC features [#44](https://github.com/Security-Experts-Community/vscode-xp/issues/44) - added code highlighting in integration tests with its updating during the editing process;
- the normalized event field in integration tests is now readonly;
- in integration tests, the `body` field is excluded from displaying the normalized event;
- the `recv_time` and `time` fields are excluded from comparing the results of normalization tests;
- added validation of paths for spaces and Cyrillic characters in normalization tests (special thanks @gautama_s for the case).

## 3.5.12 (Pre-Release)

- PoC features [#88](https://github.com/Security-Experts-Community/vscode-xp/issues/88) - adding an envelope to events without an envelope in integration tests;
- raw events from the previous test are no longer copied to the created integration test.

## 3.5.11 (Pre-Release)

- fixed a bug with receiving an expected event through the test code.

## 3.5.10 (Pre-Release)

- added basic syntax highlighting for wld files;
- the function of receiving the expected event now updates it immediately in the test code;
- improved syntax highlighting of macros.

## 3.5.9 (Pre-Release)

- fixed a bug when testing a rule with subroutines;
- fixed the creation date of the rule when using templates.

## 3.5.8 (Pre-Release)

- fixed an error editing localizations.

## 3.5.7 (Pre-Release)

- fixed the error of losing the current state of the rule code when renaming it.

## 3.5.6 (Pre-Release)

- fixed a problem with collapsing/deploying directories in the content tree.

## 3.5.5 (Pre-Release)

- the For_Profiling template has been improved, its tests and description have been updated.

## 3.5.4 (Pre-Release)

- snippets and descriptions for Base64 decoding functions have been added
; - the width of the "wrap in envelope" button
has been fixed; - For_Profiling and Windows_Logon templates have been fixed.

## 3.5.3 (Pre-Release)

- added snippets for external_src.\*, external_dst.\*, datafield\* and datafieldN;
- fixed the error of incorrect display of the status of integration tests.

## 3.5.2 (Pre-Release)

- fixed encoding during normalization;
- fixed encoding of kbpack utility output;
- removed the parameter from the appendix.xp when running normalization tests.

## 3.5.1 (Pre-Release)

- added full synchronization of the Explorer panel and the content tree.

## 3.5.0 (Pre-Release)

- added automatic highlighting of the rule in the content tree when opening files \*.co or \*.en in the Explorer (Activity Bar).

## 3.4.0

- fixed a Cyrillic error when receiving an expected event in integration tests;
- more understandable terms are used in the WebView of integration tests;
- added saving of normalized events when saving integration tests;
- closed [#111](https://github.com/Security-Experts-Community/vscode-xp/issues/111) - added validation of errors in assigning event fields in on/emit blocks;
- closed [#108](https://github.com/Security-Experts-Community/vscode-xp/issues/108) - displays the status of integration tests;
- closed [#110](https://github.com/Security-Experts-Community/vscode-xp/issues/110) - added support for correct error encoding when running integration tests;
- added checking for the presence of siemkb_tests when running integration tests;
- added support for Pre-Release builds.

## 3.3.25 (Pre-Release)

- replaced "Run a quick test" with "Get an expected event" in integration tests;
- replaced "MIME type" with "Wrap raw events in an envelope" in integration tests;
- added saving of normalized events while saving all integration tests.

## 3.3.24 (Pre-Release)

- fixed a Cyrillic error when running the "Quick Test" in integration tests.

## 3.3.23 (Pre-Release)

- closed [#111](https://github.com/Security-Experts-Community/vscode-xp/issues/111) - added validation of errors in assigning event fields in on/emit blocks;
- closed [#108](https://github.com/Security-Experts-Community/vscode-xp/issues/108) - displays the status of integration tests;
- closed [#110](https://github.com/Security-Experts-Community/vscode-xp/issues/110) - added support for correct error encoding when running integration tests;
- added checking for the presence of siemkb_tests when running integration tests;
- added support for Pre-Release builds.

## 3.3.20

- added a progress bar to wrap a large number of events in an envelope;
- added renaming of normalizations;
- removed the ability to create rules inside the tabular list directory;
- fixed [#99](https://github.com/Security-Experts-Community/vscode-xp/issues/99) - ambiguity of terminology in the interface;
- fixed [#101](https://github.com/Security-Experts-Community/vscode-xp/issues/101) - integration tests were not passed in the absence of a completed localization.

## 3.3.19

- added 7 normalization templates;
- fixed a bug when deleting tests in the WebView of integration tests (special thanks to @g4n8g);
- fixed [#84](https://github.com/Security-Experts-Community/vscode-xp/issues/84) - opening rules with Russian localization, but without English;
- the outdated Name meta information field (special thanks to @g4n8g) has been excluded from the meta information of the rules created from templates.

## 3.3.18

- fixed [#93](https://github.com/Security-Experts-Community/vscode-xp/issues/93) - mixing integration tests when saving or running all tests;
- added the function of checking localizations based on test events - closed [#94](https://github.com/Security-Experts-Community/vscode-xp/issues/94);
- modification of integration test files only when they are changed - closed [#91](https://github.com/Security-Experts-Community/vscode-xp/issues/91);
- added a check for restarting kbt utilities in integration tests.

## 3.3.17

- added support for the functionality of the extension without git installed;
- removing the hotfix with double insertion in WebView after fixing the bug in VSCode;
- updated the representation of MITRE matrix tactics in the rules metadata.

## 3.3.16

- fixed the error of packaging user content in a kb package;
- fixed the error of wrapping events in a WebView of correlated events in an envelope.

## 3.3.15

- fixed the error of wrapping several xml events in an envelope;
- the method of launching the kbpack utility has been unified.

## 3.3.14

- added automatic filling of string values of enum type fields;
- fixed the error of filling in `expect` when creating a correlation from a template;
- fixed an error filling in the `Created` metadata field when creating a correlation from a template;
- added substitution of the rule name to the default localization criteria for correlation and normalization rules.

## 3.3.13

- filtering of BOM labels from macro meta information files.

## 3.3.12

- fixed framing of the false keyword in the vehicle;
- added format processing for the CybsiGrid type;
- copying of the common folder has been added to the package unpacking algorithm.

## 3.3.11

- added a correction to the format of tabular lists when importing a package.

## 3.3.10

- fixed a bug with unpacking kb files.

## 3.3.9

- added support for integration tests for correlations using subroutines and any enrichment;
- optimized compilation of artifacts when running integration tests;
- fixed an error clearing the temporary directory when initializing the extension.

## 3.3.8

- fixed the error of generating the identifier of the knowledge base object;
- fixed templates for creating rules (thanks @Vasilisa-L).

## 3.3.7

- fixed the error of renaming the enrichment;
- added the ability to change the general description of the enrichment.

## 3.3.6

- edits to run on Linux;
- running all unit tests of normalizations does not require vehicle assembly;
- added automatic download of new stable versions in Open VSIX.

## 3.3.5

- tabular lists are compiled only for unit tests of correlations;
- added automatic addition of new stable versions to releases;
- added automatic download of new stable versions to the VSCode Marketplace.

## 3.3.4

- fixed elements in the rule creation window;
- fixed a problem with file alignment in the content tree;
- added your own folder icons.

## 3.3.3

- added support for unit tests for normalizations (special thanks to @aw350m3);
- implemented a single interface for running and editing unit tests for correlations and normalizations (special thanks to @aw350m3);
- extended validation of the filter block for enrichment;
- added functionality for alert validation.key and the first parameter of whitelisting macros;
- changes have been made to work correctly in the linux environment (special thanks to @aw350m3);
- added the ability to create normalizations (special thanks to @aw350m3);
- changes have been made to work correctly with macros;
- fixed bugs and improved stability.

## 3.2.6

- added advanced auto-completions in the filter block;
- added the ability to add events to tests in xml format from EventViewer;
- added a check for incorrect comparison in the filter block.

## 3.2.5

- saving fields of the old meta-information format is excluded;
- added automatic assembly of the vehicle circuit before running a quick test (special thanks to @zBlur);
- dst blocks have been added to the Unix_Connect template.\* and src.\* (special thanks to @g4n8g);
- fixed an error checking the correctness of the first whitelisting parameter and the correlation name for new macros.

## 3.2.4

- added support for a new meta information format;
- fixed an error adding localization of the correlation rule in one language;
- saving of the collected enrichment graph is excluded;
- adjusted Unix rule templates and snippets for the new taxonomy.

## 3.1.8

- added support for the Memoq translation system;
- added detection of incorrect use of the lower function separately and in combination with the find_substr, match, regex functions;
- fixed an ObjectId match error when creating rules from templates (special thanks to @bobyboba18 for the case);
- added output of correlated event fields;
- added the ability to normalize and enrich events in integration tests;
- added support for KBT, a single package of necessary utilities and data;
- added support for using subroutines from other expertise packages;
- optimized the collection of TS and graphs during normalization and enrichment of test events;
- optimized the collection of vehicles and graphs when correlating events;
- fixed the error of adding envelopes to raw events using medium;
- fixed the bug of clearing correlated events;
- added unix rule templates (special thanks to @paran0id_34);
- optimized artifact assembly when running integration tests;
- added snippets for Unix system events starting with Unix event*;
- added validation of equality of importance and incident.severity;
- saving ObjectId when renaming correlations and enrichments.

## 3.0.4

- external utilities are excluded from the repository;
- changed the folder structure of the project;
- extra data is excluded from the tests;
- you have selected a temporary extension icon;
- the name of the vsix file being created has been changed.

## 3.0.3

- the creation of enrichment has been translated into templates;
- fixed the error of normalizing an irrelevant raw event in integration tests;
- fixed the error of displaying a normalized event in added tests.

## 3.0.2

- fixed the error of running tests for rules with subroutines (special thanks to @bobyboba18 for the case);
- fixed the opening of the rule after errors appeared in the tests (special thanks to @bobyboba18 for the case);
- removed the opening of files with errors and warnings when building the graph, running integration tests.

## 3.0.1

- fixed possible overwriting of the old version of the rule code when renaming (special thanks to @paran0id_34 for the report).

## 3.0.0

- there is a switch of content types (SIEM, EDR) on the bottom panel;
- improved informing the user about errors in event normalization in integration tests (special thanks to @bobyboba18 for the case);
- fixed the error of saving EventID list items in double quotes in meta information.

## 2.3.38

- improved syntax highlighting of modular integration test files (.sc and .tc);
- fixed a bug with double copying using Ctrl+C, Ctrl+V.

## 2.3.36

- fixed a bug with Unix EventID support in DataSources (special thanks to @paran0id_34 for the report).

## 2.3.35

- fixed an error in highlighting and formatting unit tests.

## 2.3.34

- added highlighting of errors in filling fields in the metadata editor and checking when saving (special thanks to @paran0id_34 for the report);
- improved name correlation checking in whitelisting functions;
- compatibility with VsCodium has been verified (the same VSCode without telemetry from Microsoft);
- a significant part of the code of our correlations has been cut out of the tests and unnecessary attributes have been removed from the metadata;
- a link to the description of the RE2 syntax has been added to the description of the regex function.

## 2.3.33

- added intelligent highlighting of function calls to which a description has been added;
- added experimental highlighting of normalized events in integration tests (special thanks to @anfinogenov);
- added the first version of templates for creating correlation rules (special thanks to @zBlur).

## 2.3.32

- all problems with the kb package assembly have been solved for correct loading into SIEM via PTKB;
- bugs in snippets have been fixed and several experimental ones have been added for the event keyword;
- fixed an encoding error (or something else) in the function descriptions (special thanks to @paran0id_34 for the report);
- added descriptions of XP language functions (special thanks to @paran0id_34, @mukharlyamoff and @bobyboba18 for the implementation);
- fixed an error in the appearance of parameter descriptions for nested function calls;
- fixed the error of incorrect highlighting of the nodes of the content tree when changing the rule.

## 2.3.31

- fixed the error of renaming the correlation rule with case change only in Windows (special thanks @fake_Julia);
- added renaming of enrichment;
- added removal of the siem_id, labels, time fields from the expect section of integration tests and automatic in quick tests;
- modified the "Universal" template, now $incident.severity = $importance;
- added correct display of normalized events in normalizations despite the extension.js.

## 2.3.30

- fully implemented packaging of a single package using kbtools;
- fully implemented unpacking of one or more packages using kbtools;
- added support for an arbitrary knowledge base structure;
- the new name of the eXtraction and Processing extension;
- Improved stability and performance.

## 2.3.27

- fixed the error of incorrect generation of ObjectId when changing the rule;
- now there are no errors when working with content without git;
- highlighting of the changed and added rules now goes along with the parent directories;
- improved automatic updating of the tree when changing branches;
- fixed the error of opening macros and numbering unit tests;
- the basic functionality has started working normally on macOS.

## 2.3.24

- fixed the error of creating two regular tests when creating a correlation (special thanks to @bobyboba18 for the report).

## 2.3.23

- added a configurable prefix for created rules and packages;
- the option of unpacking kb packages into an existing repository has been improved. Packages unloaded from the old system have a name in mind GUID;

## 2.3.22

- content is saved asynchronously;
- reduced the size of the generated ObjectId to eliminate errors on the part of PTKB;
- fixed an error saving unit tests.

## 2.3.20

- default filling of description and localization for correlation rules is excluded;
- the extension can be run on Linux with default functionality;
- unpacking a kb file as a package.

## 2.3.12

- added the function of creating a package through the context menu;
- build the package in kb format via the context menu;
- extended directory operations for all types of rules;
- fixed bugs and improved stability.

## 2.3.11

- added separation of detected errors and comments by type;
- implemented a unified error parsing system in integration and unit tests;
- fixed a bug with displaying views when updating VSCode to version 1.73.

## 2.3.8

- we returned to the previous scheme of running integration tests for rules with subroutines, the subroutines work successfully for rules within a single package. The task of running tests for arbitrary subroutines will be solved in future releases.;
- performance has been checked with the new version of build tools (0.23.889).

## 2.3.7

- added highlighting of rule syntax errors in the native VSCode window when running integration and unit tests;
- when running integration tests, all correlations are collected again, since the detected timeout error is no longer reproduced.

## 2.3.5

- improved the mechanism for controlling the change of a branch in the repository;
- checking for the availability of the necessary graphs has been added to the unit tests;
- added automatic saving of tests to unit tests when they are run;
- in unit tests, the processing of the current state of each test has been improved;
- improved highlighting for query construction (special thanks to @zBlur).

## 2.3.4

- added a syntax hint for the table list file;
- the most popular keywords have been added to the autocomplete (and, or, not, with different, event, key, query, from, qhandler, limit, skip, filter, init, on, emit, close, within, timer, timeout_timer, as, insert_into, remove_from, clear_table, enrich, enrich_fields, if, then, elif, else, endif);
- added auto-completion of rule fields that start with $;
- fixed an error saving all tests (special thanks to @bobyboba18).

## 2.3.3

- when running integration tests for a rule with subroutines, not all correlations are now collected, but only from the current package of the selected rule. The remaining graphs are collected in full as before. This is done because of the way build-tools work;
- added automatic saving of the rule code when running integration (regular and fast) tests;
- implemented automatic updating of the content tree when changing the current git branch;
- the Output window is automatically displayed if it is really necessary (the result of unit tests) or an error appears;
- fixed a bug with incomplete clearing of event fields for expect;
- added removal of new lines from localizations.

## 2.3.2

- added the ability to wrap raw events copied via Ctrl+C from SIEM into an envelope;
- automatic sorting of test fields (normalized events and test code) has been implemented, for example, now the fields of the subject group.* they are nearby, and not in a chaotic order as before.

## 2.3.1

- added a new extension icon;
- automatic addition of taxonomy fields from the description file;
- updated description of functions for correlations and enriching;
- fixed an error with incorrect information about the result of graph collection.

## 2.2.9

- added highlighting of changed rules from git;
- added the ability to run quick tests for enrichment;
- fixed the error of incorrect result of quick tests for enrichments and correlations;
- description of the functions in the ptco.signature file.json when opening parentheses with parameters;
- automatic auto-completion of the functions described in the ptco.signature file.json;
- auto-completion of functions and description of their parameters has been expanded for enrichment;
- the ability to collect a vehicle diagram and graphs of normalizations, enrichment and correlation with one button.

## 2.2.6

- creation and editing of enrichments;
- renaming correlations;
- icons that work correctly when performing unit tests;
- correctly working progress bar for unit tests;
- Save the test execution status with new icons.

## 2.1.9

- fixed filling in meta information when creating a correlation;
- fixed filling in the MITRE field in the meta information;
- fixed a bug with unit tests;
- added the ability to delete unit tests.

## 2.1.7

- for rules that use subroutines, a complete correlation graph is automatically collected;
- fixed the error of wrapping test raw events in an envelope;
- updated snippets;
- modified the presentation of integration tests;
- added the ability to clear the integration test code (the 'Clear test code' button);
- added automatic cleaning of the test code during a quick test.

## 2.1.5

- fixed the error of opening enrichments, aggregations and normalizations;
- added an aggregation syntax palette;
- fixed an error saving added localizations;
- added the name of the rule a whitelisting to the template of the "Universal" correlation rule.

## 2.1.4

- added the ability to add and remove integration tests;
- integration tests are now updated (re-read from files) every time they are opened;
- fixed a bug related to doubling copied data in all webviews (integration tests and others);
- the VSCode version has been raised from "^1.43.0" to "^1.69.0";
- added default filling of the integration test code when creating it.

## 2.1.1

- a normalized event in integration tests (context menu Tests) is displayed only if it exists;
- now unit tests are updated (re-read from files) every time a rule is selected;
- fixed the error of the update button for the list of unit tests, it did not work out;
- when selecting a file .A rule in the extension opens in the Explorer view if it was previously in the list of open rules.