const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// FLYER 1: AI Agents (1080x1080 - Instagram/Square)
// ═══════════════════════════════════════════════════════════════
function generateFlyer1() {
  const w = 1080, h = 1080;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0a0a2e');
  bg.addColorStop(0.4, '#1a1a4e');
  bg.addColorStop(0.7, '#2d1b69');
  bg.addColorStop(1, '#0a0a2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Glow circle
  const glow = ctx.createRadialGradient(750, 150, 0, 750, 150, 350);
  glow.addColorStop(0, 'rgba(99,102,241,0.35)');
  glow.addColorStop(1, 'rgba(99,102,241,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Second glow
  const glow2 = ctx.createRadialGradient(150, 850, 0, 150, 850, 250);
  glow2.addColorStop(0, 'rgba(168,85,247,0.25)');
  glow2.addColorStop(1, 'rgba(168,85,247,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = 'rgba(99,102,241,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 60) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
  }
  for (let i = 0; i < h; i += 60) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
  }

  // Badge
  const badgeGrad = ctx.createLinearGradient(340, 100, 740, 100);
  badgeGrad.addColorStop(0, '#6366f1');
  badgeGrad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, 340, 100, 400, 50, 25);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('DUTCHKEM VENTURES', 540, 132);

  // Headline
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('15 AI Agents', 540, 260);

  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 72px Arial';
  ctx.fillText('Working 24/7', 540, 350);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px Arial';
  ctx.fillText('For Your Business', 540, 440);

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '26px Arial';
  ctx.fillText('Enterprise-grade AI platform built for Nigeria.', 540, 510);
  ctx.fillText('Academic, Business, Content, Finance & more.', 540, 545);

  // Feature badges
  const features = [
    { icon: '🎓', text: 'Academic Pro' },
    { icon: '💼', text: 'Business Pro' },
    { icon: '✍️', text: 'Content Pro' },
    { icon: '💰', text: 'Finance Pro' },
    { icon: '🎬', text: 'MediaStudio' },
    { icon: '🚀', text: 'ServiceMart' },
  ];

  const startX = 165;
  const badgeW = 230;
  const badgeH = 55;
  const gap = 20;
  const rows = 2;
  const cols = 3;

  features.forEach((f, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = startX + col * (badgeW + gap);
    const y = 600 + row * (badgeH + gap);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, x, y, badgeW, badgeH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(167,139,250,0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, badgeW, badgeH, 12);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${f.icon}  ${f.text}`, x + badgeW / 2, y + 35);
  });

  // CTA Button
  const ctaGrad = ctx.createLinearGradient(340, 810, 740, 810);
  ctaGrad.addColorStop(0, '#f59e0b');
  ctaGrad.addColorStop(1, '#f97316');
  ctx.fillStyle = ctaGrad;
  roundRect(ctx, 340, 810, 400, 65, 32);
  ctx.fill();

  ctx.shadowColor = 'rgba(245,158,11,0.4)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('ACTIVATE AI NOW', 540, 852);
  ctx.shadowBlur = 0;

  // URL
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '18px Arial';
  ctx.fillText('dutchkem-prosuite-app.vercel.app', 540, 930);

  // Save
  const buf = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  const out = path.join(OUTPUT_DIR, 'flyer-01-ai-agents-1080x1080.jpg');
  fs.writeFileSync(out, buf);
  console.log(`✅ ${out} (${(buf.length / 1024).toFixed(0)}KB)`);
}

// ═══════════════════════════════════════════════════════════════
// FLYER 2: Business (1200x628 - LinkedIn/Facebook banner)
// ═══════════════════════════════════════════════════════════════
function generateFlyer2() {
  const w = 1200, h = 628;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.5, '#1e293b');
  bg.addColorStop(1, '#0f766e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Top accent bar
  const bar = ctx.createLinearGradient(0, 0, w, 0);
  bar.addColorStop(0, '#14b8a6');
  bar.addColorStop(0.5, '#06b6d4');
  bar.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, w, 6);

  // Tag
  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 2;
  roundRect(ctx, 380, 60, 440, 45, 8);
  ctx.stroke();
  ctx.fillStyle = '#14b8a6';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AI-POWERED BUSINESS PLATFORM', 600, 90);

  // Headline
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 68px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Automate.', 600, 210);

  ctx.fillStyle = '#14b8a6';
  ctx.font = 'bold 68px Arial';
  ctx.fillText('Grow.', 600, 290);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 68px Arial';
  ctx.fillText('Dominate.', 600, 370);

  // Stats
  const stats = [
    { num: '15', label: 'AI AGENTS' },
    { num: '24/7', label: 'AUTOMATION' },
    { num: '60%', label: 'COST SAVINGS' },
  ];

  stats.forEach((s, i) => {
    const x = 200 + i * 300;
    ctx.fillStyle = '#14b8a6';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(s.num, x, 470);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '16px Arial';
    ctx.fillText(s.label, x, 500);
  });

  // Divider
  const divGrad = ctx.createLinearGradient(540, 0, 660, 0);
  divGrad.addColorStop(0, '#14b8a6');
  divGrad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = divGrad;
  roundRect(ctx, 540, 530, 120, 3, 2);
  ctx.fill();

  // CTA
  const ctaGrad = ctx.createLinearGradient(450, 560, 750, 560);
  ctaGrad.addColorStop(0, '#14b8a6');
  ctaGrad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = ctaGrad;
  roundRect(ctx, 450, 560, 300, 50, 25);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GET STARTED FREE', 600, 592);

  const buf = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  const out = path.join(OUTPUT_DIR, 'flyer-02-business-1200x628.jpg');
  fs.writeFileSync(out, buf);
  console.log(`✅ ${out} (${(buf.length / 1024).toFixed(0)}KB)`);
}

// ═══════════════════════════════════════════════════════════════
// FLYER 3: Startup (1080x1080 - Instagram/Square)
// ═══════════════════════════════════════════════════════════════
function generateFlyer3() {
  const w = 1080, h = 1080;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1a0533');
  bg.addColorStop(0.4, '#2d1066');
  bg.addColorStop(1, '#7c3aed');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Particles
  const particles = [
    [216, 162], [864, 270], [108, 756],
    [864, 432], [810, 648], [324, 756],
  ];
  particles.forEach(([x, y]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 20);
    g.addColorStop(0, 'rgba(167,139,250,0.6)');
    g.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  });

  // Rocket emoji (large)
  ctx.font = '80px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🚀', 540, 160);

  // Headline
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 74px Arial';
  ctx.fillText('Your 24/7', 540, 290);

  // Gradient text effect
  const textGrad = ctx.createLinearGradient(300, 310, 780, 390);
  textGrad.addColorStop(0, '#c084fc');
  textGrad.addColorStop(1, '#f472b6');
  ctx.fillStyle = textGrad;
  ctx.font = 'bold 74px Arial';
  ctx.fillText('Digital Workforce', 540, 390);

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '24px Arial';
  ctx.fillText('AI agents that work while you sleep.', 540, 450);
  ctx.fillText('Scale without hiring. Start in minutes.', 540, 485);

  // Perks grid
  const perks = [
    'AI agents work while you sleep',
    'Scale without hiring staff',
    'Start in under 5 minutes',
    'No coding required',
    'WhatsApp integration',
    'Kora Pay payments',
  ];

  perks.forEach((p, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 165 + col * 390;
    const y = 550 + row * 70;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, y, 370, 55, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(192,132,252,0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, 370, 55, 10);
    ctx.stroke();

    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('✓', x + 18, y + 35);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText(p, x + 45, y + 35);
  });

  // CTA
  const ctaGrad = ctx.createLinearGradient(340, 790, 740, 790);
  ctaGrad.addColorStop(0, '#a855f7');
  ctaGrad.addColorStop(1, '#ec4899');
  ctx.fillStyle = ctaGrad;
  roundRect(ctx, 340, 790, 400, 65, 32);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('START YOUR TRIAL', 540, 832);

  // URL
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '18px Arial';
  ctx.fillText('dutchkem-prosuite-app.vercel.app', 540, 920);

  const buf = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  const out = path.join(OUTPUT_DIR, 'flyer-03-startup-1080x1080.jpg');
  fs.writeFileSync(out, buf);
  console.log(`✅ ${out} (${(buf.length / 1024).toFixed(0)}KB)`);
}

// ═══════════════════════════════════════════════════════════════
// FLYER 4: Telegram/Discord (1200x675 - Landscape)
// ═══════════════════════════════════════════════════════════════
function generateFlyer4() {
  const w = 1200, h = 675;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0c1222');
  bg.addColorStop(0.5, '#1a2744');
  bg.addColorStop(1, '#0ea5e9');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Glow
  const glow = ctx.createRadialGradient(900, 200, 0, 900, 200, 300);
  glow.addColorStop(0, 'rgba(14,165,233,0.3)');
  glow.addColorStop(1, 'rgba(14,165,233,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Left content
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Dutchkem ProSuite', 60, 180);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 52px Arial';
  ctx.fillText('NG+', 60, 245);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '22px Arial';
  ctx.fillText('15 AI Agents Working 24/7', 60, 300);
  ctx.fillText('For Nigerian Businesses', 60, 335);

  // Stats boxes
  const boxData = [
    { num: '15', label: 'Agents' },
    { num: '24/7', label: 'Active' },
    { num: '₦0', label: 'To Start' },
  ];

  boxData.forEach((b, i) => {
    const x = 60 + i * 160;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, x, 380, 140, 80, 12);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(b.num, x + 70, 418);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px Arial';
    ctx.fillText(b.label, x + 70, 448);
  });

  // CTA
  const ctaGrad = ctx.createLinearGradient(60, 510, 360, 510);
  ctaGrad.addColorStop(0, '#0ea5e9');
  ctaGrad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = ctaGrad;
  roundRect(ctx, 60, 510, 300, 55, 27);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('ACTIVATE AI NOW', 210, 544);

  // Right side - Feature list
  ctx.textAlign = 'left';
  const features = [
    '🎓 Academic Pro — Thesis, Research',
    '💼 Business Pro — Plans, Strategy',
    '✍️ Content Pro — Blogs, Social Media',
    '💰 Finance Pro — Budgeting, Investing',
    '🎬 MediaStudio — Video, Animation',
    '🚀 ServiceMart — JAMB, WAEC, CV',
  ];

  features.forEach((f, i) => {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '18px Arial';
    ctx.fillText(f, 560, 180 + i * 45);
  });

  // URL
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('dutchkem-prosuite-app.vercel.app', 560, 480);

  const buf = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  const out = path.join(OUTPUT_DIR, 'flyer-04-landscape-1200x675.jpg');
  fs.writeFileSync(out, buf);
  console.log(`✅ ${out} (${(buf.length / 1024).toFixed(0)}KB)`);
}

// ═══════════════════════════════════════════════════════════════
// FLYER 5: Story/Vertical (1080x1920 - Instagram/TikTok Story)
// ═══════════════════════════════════════════════════════════════
function generateFlyer5() {
  const w = 1080, h = 1920;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0f0326');
  bg.addColorStop(0.3, '#1e0a4a');
  bg.addColorStop(0.7, '#4c1d95');
  bg.addColorStop(1, '#7c3aed');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Glow orbs
  [[540, 300, 400], [200, 1200, 300], [880, 1500, 250]].forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(167,139,250,0.2)');
    g.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // Top badge
  const badgeGrad = ctx.createLinearGradient(340, 120, 740, 120);
  badgeGrad.addColorStop(0, '#8b5cf6');
  badgeGrad.addColorStop(1, '#a855f7');
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, 340, 120, 400, 55, 27);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('DUTCHKEM VENTURES', 540, 156);

  // Main headline
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px Arial';
  ctx.fillText('15 AI Agents', 540, 350);

  const grad = ctx.createLinearGradient(300, 380, 780, 470);
  grad.addColorStop(0, '#c084fc');
  grad.addColorStop(1, '#f472b6');
  ctx.fillStyle = grad;
  ctx.font = 'bold 80px Arial';
  ctx.fillText('Working 24/7', 540, 460);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px Arial';
  ctx.fillText('For You', 540, 570);

  // Divider
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, 390, 630, 300, 3, 2);
  ctx.fill();

  // Features list
  const features = [
    { icon: '🎓', name: 'Academic Pro', desc: 'Thesis, Research, Citations' },
    { icon: '💼', name: 'Business Pro', desc: 'Plans, Strategy, Finance' },
    { icon: '✍️', name: 'Content Pro', desc: 'Blogs, Social, Copywriting' },
    { icon: '💰', name: 'Finance Pro', desc: 'Budgeting, Investing' },
    { icon: '🎬', name: 'MediaStudio', desc: 'Video, Animation, Editing' },
    { icon: '📝', name: 'Exam Pro', desc: 'JAMB, WAEC, NECO Prep' },
    { icon: '🗣️', name: 'Language Tutor', desc: 'Learn Any Language' },
    { icon: '✈️', name: 'Travel Planner', desc: 'Trips, Hotels, Flights' },
  ];

  features.forEach((f, i) => {
    const y = 720 + i * 110;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, 100, y, 880, 90, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(167,139,250,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, 100, y, 880, 90, 16);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '36px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(f.icon, 140, y + 58);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(f.name, 200, y + 42);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '20px Arial';
    ctx.fillText(f.desc, 200, y + 72);
  });

  // CTA
  const ctaGrad = ctx.createLinearGradient(290, 1640, 790, 1640);
  ctaGrad.addColorStop(0, '#8b5cf6');
  ctaGrad.addColorStop(1, '#ec4899');
  ctx.fillStyle = ctaGrad;
  roundRect(ctx, 290, 1640, 500, 75, 37);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('START FREE TODAY', 540, 1688);

  // URL
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '20px Arial';
  ctx.fillText('dutchkem-prosuite-app.vercel.app', 540, 1800);

  // Swipe up hint
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '18px Arial';
  ctx.fillText('↑ Swipe up to get started', 540, 1870);

  const buf = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  const out = path.join(OUTPUT_DIR, 'flyer-05-story-1080x1920.jpg');
  fs.writeFileSync(out, buf);
  console.log(`✅ ${out} (${(buf.length / 1024).toFixed(0)}KB)`);
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Rounded Rectangle
// ═══════════════════════════════════════════════════════════════
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════════
// GENERATE ALL
// ═══════════════════════════════════════════════════════════════
console.log('🎨 Generating promotional flyers...\n');
generateFlyer1();
generateFlyer2();
generateFlyer3();
generateFlyer4();
generateFlyer5();
console.log('\n✅ All flyers generated in promotional-content/output/');
