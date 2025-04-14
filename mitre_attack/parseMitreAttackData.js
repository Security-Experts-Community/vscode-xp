const fs = require('fs');
const path = require('path');

const dataFilePaths = [
  path.join(__dirname, 'data', 'raw', 'enterprise-attack.json'),
  path.join(__dirname, 'data', 'raw', 'mobile-attack.json'),
  path.join(__dirname, 'data', 'raw', 'ics-attack.json')
];

function extractTacticsAndTechniques(dataFilePaths) {
  const result = new Map();
  const techniquesMetadata = {};

  dataFilePaths.forEach((dataFilePath) => {
    const { objects } = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

    for (const object of objects) {
      const mitreAttackReference = object.external_references?.find(
        (externalReference) => externalReference.source_name == 'mitre-attack'
      );

      object.kill_chain_phases?.forEach(({ kill_chain_name, phase_name }) => {
        if (kill_chain_name == 'mitre-attack' || 'mitre-ics-attack') {
          if (!result.has(phase_name)) {
            result.set(phase_name, new Set());
          }

          if (mitreAttackReference) {
            result.get(phase_name).add(mitreAttackReference.external_id);
            techniquesMetadata[mitreAttackReference.external_id] ??= {
              id: mitreAttackReference.external_id,
              name: object.name,
              description: object.description,
              deprecated: object.x_mitre_deprecated,
              url: mitreAttackReference.url
            };
          }
        }
      });
    }
  });

  return {
    phases: Array.from(result.keys()),
    techniques: Object.fromEntries(
      Array.from(result.entries()).map(([phase, techniques]) => {
        const sortedTechniques = Array.from(techniques).sort(new Intl.Collator().compare);
        return [phase, sortedTechniques];
      })
    ),
    techniquesMetadata
  };
}

parsedData = path.join(__dirname, 'data', 'parsed');

fs.mkdirSync(parsedData, { recursive: true });

fs.writeFileSync(
  path.join(parsedData, 'attack.json'),
  JSON.stringify(extractTacticsAndTechniques(dataFilePaths))
);
