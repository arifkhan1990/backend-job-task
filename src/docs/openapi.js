import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

const docsDirectory = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.join(docsDirectory, 'openapi.yaml');
const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));

const docsCsp =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;";

export function mountApiDocs(app) {
  app.get('/api/openapi.yaml', (_req, res) => {
    res.type('application/yaml').sendFile(specPath);
  });

  app.use(
    '/api/docs',
    (_req, res, next) => {
      // Swagger UI ships inline bootstrap styles/scripts; this override is
      // scoped to the documentation route only.
      res.setHeader('Content-Security-Policy', docsCsp);
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(spec, { customSiteTitle: 'Notes API docs' }),
  );
}
