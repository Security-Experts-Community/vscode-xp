# Check for logon_type  & src.ip (rule cmstp)

table_list default
#Some comment
table_list {"Windows_Logon_Sessions":[{"host":"test_w10x64-130.org", "session_id":"39868910", "logon_type":"3"}], "Active_External_Sessions":[{"external_ip":"8.8.8.8", "provider":"Susp provider"}]}
# Another one comment
{"datafield10": "CMSTP.EXE", "subject.account.name": "username", "category.low": "CMSTP","incident.aggregation.timeout": 7200, "_objects": [{"AssetId": null, "Fqdn": "test_w10x64-130", "IpAddress": null, "EventTimestamp": "2021-08-09T08:48:12Z"}, {"AssetId": null, "Fqdn": "test_w10x64-130", "IpAddress": null, "EventTimestamp": "2021-08-09T08:48:12Z"}, {"AssetId": null, "Fqdn": null, "IpAddress": "127.0.0.1", "EventTimestamp": "2021-08-09T08:48:12Z"}],"subevents": ["b03631c1-ebd5-454e-8bf4-71897e44cb7e"], "uuid": "1268d453-5fa2-42ec-843f-a6608a39349b"}
#Этот комментарий не будет удалён
{"datafield10": "CMSTP.EXE", "subject.account.name": "username", "category.low": "CMSTP","incident.aggregation.timeout": 7200, "_objects": [{"AssetId": null, "Fqdn": "test_w10x64-130", "IpAddress": null, "EventTimestamp": "2021-08-09T08:48:12Z"}, {"AssetId": null, "Fqdn": "test_w10x64-130", "IpAddress": null, "EventTimestamp": "2021-08-09T08:48:12Z"}, {"AssetId": null, "Fqdn": null, "IpAddress": "127.0.0.1", "EventTimestamp": "2021-08-09T08:48:12Z"}],"subevents": ["b03631c1-ebd5-454e-8bf4-71897e44cb7e"], "uuid": "1268d453-5fa2-42ec-843f-a6608a39349b"}
#ExpectedComment Here
expect 1 {"logon_type":3,"assigned_src_ip":"8.8.8.8","src.geo.org":"Susp provider"}
