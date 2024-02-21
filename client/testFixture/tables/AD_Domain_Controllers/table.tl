name: AD_Domain_Controllers
fields:
    - complex_key:
          compositeFields:
              - ip
              - hostname
          index: true
          nullable: false
          primaryKey: true
          type: composite
          unique: true
    - ip:
          index: false
          nullable: false
          primaryKey: false
          type: String
    - hostname:
          index: true
          nullable: false
          primaryKey: false
          type: String
fillType: Registry
type: 1
userCanEditContent: true
defaults: {}