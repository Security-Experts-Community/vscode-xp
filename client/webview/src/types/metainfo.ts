// The form in which the extension sends the metainfo data
export type MetaInfoDto = {
  Name: string;
  Created: string;
  Updated: string;
  ObjectId: string;
  Usecases: string[];
  KnowledgeHolders: string[];
  Falsepositives: string[];
  Improvements: string[];
  References: string[];
  DataSources: MetaInfoDataSource[];
  ATTACK: MetaInfoAttack[];
  dependencies?: MetaInfoDependencies;
};

export type MetaInfoDataSource = {
  Provider: string;
  EventID: string[];
};

export type MetaInfoAttack = {
  Tactic: string;
  Techniques: string[];
};

export type MetaInfo = {
  name: string;
  createdAt: string;
  updatedAt: string;
  objectId: string;
  usecases: string[];
  knowledgeHolders: string[];
  falsepositives: string[];
  improvements: string[];
  references: string[];
  dataSources: MetaInfoDataSource[];
  attacks: MetaInfoAttack[];
  dependencies: MetaInfoDependencies;
};

export type MetaInfoDependencies = Record<string, Record<string, string>>;

export type MetaInfoAttackData = {
  phases: string[];
  techniques: Record<string, string[]>;
  techniquesMetadata: Record<
    string,
    {
      id: string;
      url: string;
      name: string;
      description: string;
      deprecated?: boolean;
    }
  >;
};
