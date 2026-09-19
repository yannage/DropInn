import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Development uses the production command handler with an isolated local repository.
// Secrets loaded here stay in the Node process; Vite only exposes VITE_* to browsers.
function adventureServer(env: Record<string, string>): Plugin {
  return {
    name: 'dropinn-command-server',
    configureServer(server) {
      let handler: Promise<(request: Request) => Promise<Response>> | undefined;
      server.middlewares.use('/api/dropinn', async (req, res) => {
        try {
          if (!handler) {
            handler = server.ssrLoadModule('/server/dropinn.ts').then(module =>
              module.createDropinnHandler({ local: env.DROPINN_BACKEND !== 'supabase', env: { ...process.env, ...env } }));
          }
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            const buffer = Buffer.from(chunk);
            size += buffer.length;
            if (size > 32_768) { res.writeHead(413); res.end('Request too large'); return; }
            chunks.push(buffer);
          }
          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) {
            if (value) headers.set(name, Array.isArray(value) ? value.join(',') : value);
          }
          const request = new Request('http://localhost/api/dropinn', {
            method: req.method, headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks).toString(),
          });
          const response = await (await handler)(request);
          res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
          res.end(await response.text());
        } catch (error) {
          server.config.logger.error(error instanceof Error ? error.message : 'Adventure request failed');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'The adventure server could not respond. Please retry.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), adventureServer(env)],
    define: { 'import.meta.env.VITE_DROPINN_BACKEND': JSON.stringify(env.DROPINN_BACKEND === 'supabase' ? 'supabase' : 'local') },
  };
});
