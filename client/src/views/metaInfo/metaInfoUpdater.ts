import * as classTransformer from 'class-transformer';
import { Extension } from 'typescript';
import { DialogHelper } from '../../helpers/dialogHelper';

import { Attack } from '../../models/metaInfo/attack';
import { DataSource } from '../../models/metaInfo/dataSource';
import { MetaInfo } from '../../models/metaInfo/metaInfo';
import { IncorrectFieldFillingException } from '../incorrectFieldFillingException';


export class MetaInfoUpdater {
	public update(metaInfo: MetaInfo, fields: any): MetaInfo {

		metaInfo.setName(fields.Name);

		const useCases = this.filterAndTrimArray(fields.Usecases);
		metaInfo.setUseCases(useCases);

		const knowledgeHolders = this.filterAndTrimArray(fields.KnowledgeHolders);
		metaInfo.setKnowledgeHolders(knowledgeHolders);

		const improvements = this.filterAndTrimArray(fields.Improvements);
		metaInfo.setImprovements(improvements);

		const falsepositives = this.filterAndTrimArray(fields.Falsepositives);
		metaInfo.setFalsePositives(falsepositives);

		const references = this.filterAndTrimArray(fields.References);
		metaInfo.setReferences(references);

		if (fields.DataSources) {
			const dataSources = Array.from(fields.DataSources)
				.map(dt => classTransformer.plainToInstance(DataSource, dt));

			// Встречаются null в случае несоответствия типа элемента списка с number.
			const errorDs = dataSources.find(ds => ds.EventID.some(ei => !ei));
			if (errorDs) {
				throw new IncorrectFieldFillingException(`Некорректное заполнение списка событий провайдера '${errorDs.Provider}', который должен быть указаны в виде списка идентификаторов через запятую.`);
			}

			metaInfo.setDataSources(dataSources);
		}

		if (fields.ATTACK) {
			const attacks = Array.from(fields.ATTACK)
				.map(dt => classTransformer.plainToInstance(Attack, dt));

			for (const attack of attacks) {
				const validationResult = attack.Techniques.every(t => {
					const result = /T(\d+\.\d+|\d+)/g.test(t);
					return result;
				});

				if (!validationResult) {
					throw new IncorrectFieldFillingException(`Некорректное заполнение тактики '${attack.Tactic}'. Техники должны начинаться с 'T' и быть в формате T<N> или T<N>.<M>, где <N>, <M> - натуральные числа.`);
				}
			}

			metaInfo.setAttacks(attacks);
		}

		return metaInfo;
	}

	private filterAndTrimArray(input: any): string[] {
		if (!input) {
			return [];
		}
		return (input as string[]).filter(elem => elem && elem != "").map(c => c.trim());
	}
}