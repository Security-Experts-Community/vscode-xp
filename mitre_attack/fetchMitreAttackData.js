const https = require('https');
const path = require('path');
const fs = require('fs');

const rawDataUrls = [
  'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/refs/heads/master/enterprise-attack/enterprise-attack.json',
  'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/refs/heads/master/ics-attack/ics-attack.json',
  'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/refs/heads/master/mobile-attack/mobile-attack.json'
];

function downloadFile(fileUrl) {
  return new Promise((resolve, reject) => {
    https
      .get(fileUrl, (response) => {
        const [outFileName] = fileUrl.split('/').slice(-1);
        const outFilePath = path.join(__dirname, 'data', 'raw', outFileName);

        if (response.statusCode == 200) {
          const fileStream = fs.createWriteStream(outFilePath);
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            console.log(`File \`${fileUrl}\` successfully downloaded to \`${outFilePath}\``);
            resolve();
          });
          return;
        }

        throw new Error(response.message);
      })
      .on('error', (error) => {
        console.error(`Error downloading file: ${error.message}`);
        reject();
      });
  });
}

Promise.all(rawDataUrls.map(downloadFile)).then(() => {
  console.log('\nCompleted successfully');
});
