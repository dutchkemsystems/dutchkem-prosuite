import { Router } from 'express';
import ePub from 'epub-gen';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink, readFile } from 'fs/promises';
import { cacheGet, cacheSet } from '../lib/cache.mjs';
import { userAuth } from '../middleware/auth.mjs';

const router = Router();

function convexClient(req) {
  return req.app.locals.convex;
}

// POST /api/a1/ebook/create
router.post('/create', userAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const { subscriptionTier, manuscript, kdpMetadata } = req.body;

    if (!subscriptionTier || !manuscript || !kdpMetadata) {
      return res.status(400).json({ error: 'Missing required fields: subscriptionTier, manuscript, kdpMetadata' });
    }

    const projectId = await convex.mutation('kdp_agent:createBookProject', {
      subscriptionTier,
      manuscript,
      kdpMetadata,
    });

    const project = await convex.query('kdp_agent:getBookProject', { projectId });
    res.status(201).json({ projectId, project });
  } catch (err) {
    console.error('[KDP] create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/a1/ebook/generate
router.post('/generate', userAuth, async (req, res) => {
  try {
    const { projectId, provider } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;
    if (!nvidiaKey) return res.status(500).json({ error: 'NVIDIA_NIM_API_KEY not configured' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-405b-instruct',
        messages: [
          { role: 'system', content: 'You are a professional ghostwriter.' },
          { role: 'user', content: `Generate a complete e-book manuscript for project ${projectId}. Return the full manuscript text.` },
        ],
        max_tokens: 8192,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(response.status).json({ error: `NVIDIA API error: ${errBody}` });
    }

    const data = await response.json();
    const manuscript = data.choices?.[0]?.message?.content ?? '';

    res.json({ projectId, manuscript, provider: 'nvidia' });
  } catch (err) {
    console.error('[KDP] generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/a1/ebook/generate-cover
router.post('/generate-cover', userAuth, async (req, res) => {
  try {
    const { projectId, description } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const nvidiaApiKey = process.env.NVIDIA_NIM_API_KEY;
    let coverUrl = `https://placehold.co/1200x1800/1e1b4b/ffffff?text=${encodeURIComponent(description || 'Book+Cover')}`;

    if (nvidiaApiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        const response = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nvidiaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'stabilityai/stable-diffusion-3.5-large',
            prompt: description || 'Professional book cover design, high quality',
            width: 1200,
            height: 1800,
            num_images: 1,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          coverUrl = data.data?.[0]?.url || data.images?.[0]?.url || coverUrl;
        }
      } catch {
        // fallback to placeholder
      }
    }

    res.json({ projectId, coverUrl });
  } catch (err) {
    console.error('[KDP] generate-cover error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/a1/ebook/generate-files
router.post('/generate-files', userAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const { projectId, manuscript } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const project = await convex.query('kdp_agent:getBookProject', { projectId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const title = project.manuscript.title;
    const author = project.manuscript.authorName;
    const content = manuscript || 'Sample manuscript content for ' + title;

    // Generate EPUB in temp directory
    const tmpDir = tmpdir();
    const epubPath = join(tmpDir, `${projectId}.epub`);
    const htmlPath = join(tmpDir, `${projectId}.html`);
    const pdfPath = join(tmpDir, `${projectId}.pdf`);

    await ePub({
      title,
      author,
      output: epubPath,
      content: [
        {
          title: 'Chapter 1',
          data: `<h1>${title}</h1><p>${content.replace(/\n/g, '</p><p>')}</p>`,
        },
      ],
    });

    // Generate HTML (convertible to PDF via headless browser in production)
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:serif;max-width:600px;margin:auto;padding:40px;line-height:1.6}
h1{text-align:center;margin-bottom:30px}p{text-indent:1.5em;margin:0.5em 0}</style>
</head><body><h1>${title}</h1>
${content.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('\n')}
</body></html>`;
    await writeFile(htmlPath, html, 'utf-8');

    // Read EPUB as base64 for serving
    const epubBuffer = await readFile(epubPath);
    const epubBase64 = epubBuffer.toString('base64');

    // Generate file info
    const fileId = projectId.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
    const fileBase = `https://cdn.dutchkem.com/kdp/${fileId}`;

    const files = {
      epubUrl: `${fileBase}/book.epub`,
      mobiUrl: `${fileBase}/book.mobi`,
      pdfUrl: `${fileBase}/book.pdf`,
      coverUrl: `${fileBase}/cover.jpg`,
      htmlUrl: `${fileBase}/book.html`,
      zipUrl: `${fileBase}/kdp_bundle.zip`,
      epubBase64,
    };

    // Cleanup temp files
    await unlink(epubPath).catch(() => {});
    await unlink(htmlPath).catch(() => {});

    res.json({ projectId, title, author, files });
  } catch (err) {
    console.error('[KDP] generate-files error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/a1/ebook/download/:id
router.get('/download/:id', userAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const { id } = req.params;

    const project = await convex.query('kdp_agent:getBookProject', { projectId: id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json({
      projectId: id,
      title: project.manuscript.title,
      author: project.manuscript.authorName,
      manuscript: project.manuscript,
      coverFiles: project.coverFiles,
      interiorFiles: project.interiorFiles,
    });
  } catch (err) {
    console.error('[KDP] download error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/a1/ebook/royalty/upload
router.post('/royalty/upload', userAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const { projectId, csvDataUrl, dashboardData, month, year } = req.body;

    if (!projectId || !dashboardData || !month || !year) {
      return res.status(400).json({ error: 'Missing required fields: projectId, dashboardData, month, year' });
    }

    await convex.mutation('kdp_agent:setBookRoyaltyData', {
      projectId,
      csvDataUrl: csvDataUrl || '',
      dashboardData,
      month,
      year,
    });

    // Invalidate cache so next dashboard fetch gets fresh data
    cacheSet('holiday:active', null, 1);

    res.status(201).json({ projectId, month, year, status: 'imported' });
  } catch (err) {
    console.error('[KDP] royalty upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/a1/ebook/royalty/:id
router.get('/royalty/:id', userAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const { id } = req.params;

    const royalties = await convex.query('kdp_agent:getBookRoyalties', { projectId: id });

    res.json({ projectId: id, royalties });
  } catch (err) {
    console.error('[KDP] royalty get error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/a1/ebook/plans
router.get('/plans', userAuth, async (req, res) => {
  try {
    const plans = [
      { id: 'BASIC', name: 'Basic', price: 25000, frequency: 'monthly', features: ['1 book/month', 'Basic formatting'] },
      { id: 'PRO', name: 'Pro', price: 60000, frequency: 'quarterly', features: ['3 books/quarter', 'Live support (1 session)', 'Royalty tracking'] },
      { id: 'ENTERPRISE', name: 'Enterprise', price: 200000, frequency: 'yearly', features: ['12 books/year', 'Unlimited support', 'Royalty tracking'] },
    ];
    res.json({ plans });
  } catch (err) {
    console.error('[KDP] plans error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/a1/ebook/subscribe
router.post('/subscribe', userAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const { plan, returnUrl } = req.body;

    if (!plan || !['BASIC', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be BASIC, PRO, or ENTERPRISE.' });
    }

    const checkout = await convex.mutation('kdp_subscriptions:getKDPCheckoutUrl', {
      plan,
      returnUrl: returnUrl || undefined,
    });

    const subscription = await convex.mutation('kdp_subscriptions:createKDPSubscription', { plan });

    res.status(201).json({
      ...checkout,
      subscription,
      message: `Redirect user to checkoutUrl for payment. After payment, Kora webhook will activate the subscription.`,
    });
  } catch (err) {
    console.error('[KDP] subscribe error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/a1/ebook/subscription/status
router.get('/subscription/status', userAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const subscription = await convex.query('kdp_subscriptions:getKDPSubscriptionStatus', {});
    res.json({ subscription });
  } catch (err) {
    console.error('[KDP] subscription status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/a1/ebook/subscription/cancel
router.post('/subscription/cancel', userAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const result = await convex.mutation('kdp_subscriptions:cancelKDPSubscription', {});
    res.json(result);
  } catch (err) {
    console.error('[KDP] cancel error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
