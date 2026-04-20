import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
       {
         name: 'api-middleware',
         configureServer(server) {
           server.middlewares.use('/api/ai', (req, res, next) => {
             if (req.method !== 'POST') return next()
             
             let body = ''
             req.on('data', chunk => { body += chunk })
             req.on('end', async () => {
               try {
                 // Populate process.env with loaded env vars so api/ai.ts can read them
                 Object.assign(process.env, env)
                 
                 const { default: handler } = await server.ssrLoadModule('./api/ai.ts')
                 
                 // Create a web standard Request object
                 const protocol = req.headers.referer?.split(':')[0] || 'http'
                 const request = new Request(`${protocol}://${req.headers.host}${req.url}`, {
                   method: 'POST',
                   headers: req.headers as Record<string, string>,
                   body: body || null
                 })
                 
                 const response = await handler(request)
                 
                 res.statusCode = response.status
                 response.headers.forEach((value: string, key: string) => {
                   res.setHeader(key, value)
                 })
                 
                 const responseBody = await response.text()
                 res.end(responseBody)
               } catch (err) {
                 console.error('API Error:', err)
                 res.statusCode = 500
                 res.end(JSON.stringify({ ok: false, error: 'Internal Dev Server Error' }))
               }
             })
           })
           
           // PayPal API routes
           server.middlewares.use('/api/paypal/create-order', (req, res, next) => {
             if (req.method !== 'POST') return next()
             
             let body = ''
             req.on('data', chunk => { body += chunk })
             req.on('end', async () => {
               try {
                 // Populate process.env with loaded env vars
                 Object.assign(process.env, env)
                 
                 const { default: handler } = await server.ssrLoadModule('./api/paypal.ts')
                 
                 // Create a web standard Request object
                 const protocol = req.headers.referer?.split(':')[0] || 'http'
                 const request = new Request(`${protocol}://${req.headers.host}${req.url}`, {
                   method: 'POST',
                   headers: req.headers as Record<string, string>,
                   body: body || null
                 })
                 
                 const response = await handler(request)
                 
                 res.statusCode = response.status
                 response.headers.forEach((value: string, key: string) => {
                   res.setHeader(key, value)
                 })
                 
                 const responseBody = await response.text()
                 res.end(responseBody)
               } catch (err) {
                 console.error('PayPal API Error:', err)
                 res.statusCode = 500
                 res.end(JSON.stringify({ error: 'Internal Dev Server Error' }))
               }
             })
           })
           
           server.middlewares.use('/api/paypal/verify-payment', (req, res, next) => {
             if (req.method !== 'POST') return next()
             
             let body = ''
             req.on('data', chunk => { body += chunk })
             req.on('end', async () => {
               try {
                 // Populate process.env with loaded env vars
                 Object.assign(process.env, env)
                 
                 const { default: handler } = await server.ssrLoadModule('./api/paypal/verify.ts')
                 
                 // Create a web standard Request object
                 const protocol = req.headers.referer?.split(':')[0] || 'http'
                 const request = new Request(`${protocol}://${req.headers.host}${req.url}`, {
                   method: 'POST',
                   headers: req.headers as Record<string, string>,
                   body: body || null
                 })
                 
                 const response = await handler(request)
                 
                 res.statusCode = response.status
                 response.headers.forEach((value: string, key: string) => {
                   res.setHeader(key, value)
                 })
                 
                 const responseBody = await response.text()
                 res.end(responseBody)
               } catch (err) {
                 console.error('PayPal Verify API Error:', err)
                 res.statusCode = 500
                 res.end(JSON.stringify({ error: 'Internal Dev Server Error' }))
               }
             })
           })
         }
       }
    ],
  }
})
