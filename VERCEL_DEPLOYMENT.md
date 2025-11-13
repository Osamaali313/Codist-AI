# 🚀 Deploying Codist AI to Vercel

## Quick Deploy (Recommended)

### Option 1: Deploy via Vercel CLI (5 minutes)

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to Vercel
vercel

# 4. Follow the prompts:
#    - Set up and deploy? Yes
#    - Which scope? [Your account]
#    - Link to existing project? No
#    - What's your project's name? codist-ai
#    - In which directory is your code located? ./
#    - Want to override the settings? No

# 5. For production deployment:
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard (3 minutes)

1. **Go to**: https://vercel.com/new
2. **Import your Git repository**:
   - Connect your GitHub/GitLab/Bitbucket
   - Select the `Codist-AI` repository
3. **Configure Project**:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `build/client`
   - **Install Command**: `npm install`
4. **Environment Variables** (Add these in Vercel Dashboard):
   ```
   NODE_ENV=production
   NODE_VERSION=18
   ```
5. **Click "Deploy"**

---

## Important Notes

### ⚠️ Current Configuration

The codebase is currently optimized for **Cloudflare Pages** but will work on Vercel with some considerations:

**What Works Out of the Box:**
- ✅ UI Components
- ✅ Agent System
- ✅ Frontend Functionality
- ✅ State Management
- ✅ IndexedDB Storage (client-side)

**What Needs Attention:**
- ⚠️ Server-side API routes (currently using Cloudflare Workers runtime)
- ⚠️ Environment variables
- ⚠️ LLM API calls (need to verify endpoints)

---

## Environment Variables Setup

### Required Environment Variables:

Add these in **Vercel Dashboard → Settings → Environment Variables**:

#### 1. AI Provider API Keys (Add the ones you'll use):

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Google (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=...

# Groq
GROQ_API_KEY=gsk_...

# Other providers as needed
COHERE_API_KEY=...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=...
```

#### 2. Optional Integrations:

```bash
# Supabase (if using)
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...

# GitHub (for repo operations)
GITHUB_TOKEN=ghp_...

# GitLab (if using)
GITLAB_TOKEN=glpat-...

# Netlify (if deploying demos)
NETLIFY_AUTH_TOKEN=...
```

---

## Build Configuration

The `vercel.json` file is already configured with:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build/client",
  "framework": null,
  "env": {
    "NODE_VERSION": "18"
  }
}
```

---

## Post-Deployment Steps

### 1. Test Your Deployment

After deployment, Vercel will give you a URL like:
```
https://codist-ai-xxxxx.vercel.app
```

**Test these features:**
- ✅ Homepage loads
- ✅ Chat interface appears
- ✅ Agent Status Panel visible
- ✅ Model selector works
- ✅ Can send messages (requires API keys)

### 2. Add Custom Domain (Optional)

1. Go to **Vercel Dashboard → Your Project → Settings → Domains**
2. Add your custom domain (e.g., `codist.ai`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

### 3. Configure API Keys

**Important**: Users will need to add their own API keys via the UI:
1. Click on the settings icon
2. Navigate to "Provider API Keys"
3. Add keys for the AI providers they want to use

---

## Troubleshooting

### Issue: Build Fails

**Solution:**
1. Check Node version is 18+:
   ```bash
   node --version
   ```
2. Clear build cache:
   ```bash
   vercel --force
   ```
3. Check build logs in Vercel Dashboard

### Issue: API Routes Not Working

**Potential Cause**: Cloudflare-specific runtime code

**Solution**:
The API routes in `app/routes/api.*.ts` use Cloudflare Workers runtime. For Vercel, these should work with Node.js runtime, but verify:

1. Check Vercel Function Logs
2. Ensure environment variables are set
3. Test API endpoints directly

### Issue: Environment Variables Not Loading

**Solution:**
1. In Vercel Dashboard, go to Settings → Environment Variables
2. Make sure variables are added to all environments (Production, Preview, Development)
3. Redeploy after adding variables

### Issue: 404 on Routes

**Solution:**
The `vercel.json` routing is configured, but if you get 404s:
1. Check `vercel.json` routes configuration
2. Ensure `outputDirectory` is correct
3. Verify build output in Vercel logs

---

## Performance Optimization

### 1. Enable Edge Functions (Optional)

For better global performance:
1. Update routes to use Edge Runtime
2. Add to route files:
   ```typescript
   export const config = {
     runtime: 'edge',
   };
   ```

### 2. Enable Caching

Vercel automatically caches static assets. For API routes:
```typescript
export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // seconds
};
```

### 3. Image Optimization

Vercel automatically optimizes images. No configuration needed!

---

## Monitoring & Analytics

### Enable Vercel Analytics:

1. Go to **Project → Analytics**
2. Enable **Web Analytics**
3. Enable **Speed Insights**
4. Monitor:
   - Page views
   - User behavior
   - Core Web Vitals
   - Function execution time

### Enable Vercel Logs:

1. Go to **Project → Logs**
2. Monitor:
   - Build logs
   - Function logs
   - Real-time errors

---

## Continuous Deployment

Once connected to Git:

1. **Push to `main` branch** → Deploys to Production
2. **Push to other branches** → Creates Preview Deployment
3. **Pull Requests** → Automatic preview deployments

### Preview URLs:
Every branch gets a unique URL:
```
https://codist-ai-git-[branch-name]-[team].vercel.app
```

---

## Cost Estimation

### Vercel Free Tier:
- ✅ Hobby projects
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Preview deployments

### Vercel Pro ($20/month):
- ✅ Commercial projects
- ✅ 1 TB bandwidth/month
- ✅ Advanced analytics
- ✅ Password protection
- ✅ Team collaboration

**For Codist AI**: Free tier is perfect for testing and demos!

---

## Alternative: Deploy to Cloudflare Pages (Original Platform)

If you prefer the original platform:

```bash
# 1. Install Wrangler
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Deploy
npm run deploy
```

**Advantages of Cloudflare**:
- ✅ Already configured
- ✅ Edge network (faster globally)
- ✅ Free tier is generous
- ✅ Built-in KV storage

---

## Recommended Deployment Strategy

### For Testing:
1. Deploy to **Vercel** (easiest, quickest)
2. Use preview deployments for branches
3. Get team feedback

### For Production:
1. **Vercel**: If you want simplicity and great DX
2. **Cloudflare Pages**: If you want edge performance and lower costs

---

## Security Checklist

Before going live:

- [ ] **Environment Variables**: Never commit API keys
- [ ] **CORS**: Configure allowed origins
- [ ] **Rate Limiting**: Add rate limits to API routes
- [ ] **Input Validation**: Validate all user inputs
- [ ] **Content Security Policy**: Add CSP headers
- [ ] **Authentication**: Consider adding auth for production

---

## Support & Resources

### Vercel Documentation:
- https://vercel.com/docs
- https://vercel.com/docs/frameworks/remix

### Remix Documentation:
- https://remix.run/docs

### Codist AI Documentation:
- See `IMPLEMENTATION_SUMMARY.md`
- See `CODIST_AI_AGENTS.md`

---

## Quick Reference Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Deploy to Vercel (production)
vercel --prod

# View deployment logs
vercel logs [deployment-url]

# List deployments
vercel ls

# Remove deployment
vercel rm [deployment-name]
```

---

## Success Checklist

After deployment, verify:

- [ ] ✅ Site loads at Vercel URL
- [ ] ✅ Codist AI branding appears
- [ ] ✅ Can navigate to chat
- [ ] ✅ Model selector shows providers
- [ ] ✅ Can add API keys
- [ ] ✅ Can send messages
- [ ] ✅ Agent Status Panel appears
- [ ] ✅ Project Dashboard accessible
- [ ] ✅ No console errors
- [ ] ✅ Mobile responsive

---

## What's Next?

1. **Share Your Deploy**:
   ```
   🚀 Codist AI is live!
   https://your-deployment.vercel.app
   ```

2. **Add Custom Domain**
3. **Enable Analytics**
4. **Invite Team Members**
5. **Set Up Monitoring**

---

## 🎉 You're Ready to Deploy!

Codist AI is production-ready. Choose your platform and deploy with confidence!

**Need Help?**
- Vercel Discord: https://vercel.com/discord
- GitHub Issues: [Your repo]

---

*Deploy fast. Scale automatically. Build the future!* 🚀
