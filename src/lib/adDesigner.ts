// ═══════════════════════════════════════════════════════════════════
// AD DESIGNER - Creates completely NEW unique designs from scratch
// No reuse of existing frontend components
// ═══════════════════════════════════════════════════════════════════

export interface AdDesignData {
  headline: string;
  subheadline?: string;
  body: string;
  cta: string;
  url: string;
  template: 'social_media' | 'story' | 'banner' | 'flyer' | 'poster';
  style: 'modern' | 'vibrant' | 'minimal' | 'corporate' | 'playful';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const TEMPLATE_CONFIGS = {
  social_media: { width: 1080, height: 1080, name: 'Social Media Ad' },
  story: { width: 1080, height: 1920, name: 'Story/Reel' },
  banner: { width: 728, height: 90, name: 'Web Banner' },
  flyer: { width: 1080, height: 1920, name: 'Marketing Flyer' },
  poster: { width: 1080, height: 1350, name: 'Event Poster' },
};

// ═══════════════════════════════════════════════════════════════════
// GENERATE COMPLETELY NEW AD IMAGE
// ═══════════════════════════════════════════════════════════════════

export async function generateNewAdImage(data: AdDesignData): Promise<Blob> {
  const config = TEMPLATE_CONFIGS[data.template];
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not create canvas context');

  // Draw background gradient
  const gradient = ctx.createLinearGradient(0, 0, config.width, config.height);
  gradient.addColorStop(0, data.colors.primary);
  gradient.addColorStop(1, data.colors.secondary);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, config.width, config.height);

  // Add decorative elements
  drawDecorativeElements(ctx, config.width, config.height, data.colors);

  // Draw headline
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.floor(config.width * 0.06)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(data.headline, config.width / 2, config.height * 0.25);

  // Draw subheadline if provided
  if (data.subheadline) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `${Math.floor(config.width * 0.035)}px Arial`;
    ctx.fillText(data.subheadline, config.width / 2, config.height * 0.35);
  }

  // Draw body text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${Math.floor(config.width * 0.025)}px Arial`;
  wrapText(ctx, data.body, config.width / 2, config.height * 0.5, config.width * 0.8, config.width * 0.03);

  // Draw CTA button
  const btnWidth = config.width * 0.35;
  const btnHeight = config.height * 0.06;
  const btnX = (config.width - btnWidth) / 2;
  const btnY = config.height * 0.7;
  
  ctx.fillStyle = data.colors.accent;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnWidth, btnHeight, btnHeight / 2);
  ctx.fill();
  
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${Math.floor(config.width * 0.025)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(data.cta, config.width / 2, btnY + btnHeight * 0.65);

  // Draw URL
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = `${Math.floor(config.width * 0.02)}px Arial`;
  ctx.fillText(data.url, config.width / 2, config.height * 0.88);

  // Draw footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = `${Math.floor(config.width * 0.015)}px Arial`;
  ctx.fillText('Powered by DutchKem Ventures Prosuite', config.width / 2, config.height * 0.95);

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/jpeg', 0.95);
  });
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function drawDecorativeElements(ctx: CanvasRenderingContext2D, width: number, height: number, colors: any) {
  // Circle decoration top-right
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.15, width * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Circle decoration bottom-left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.arc(width * 0.15, height * 0.85, width * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Accent line
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(width * 0.1, height * 0.42);
  ctx.lineTo(width * 0.9, height * 0.42);
  ctx.stroke();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE VIDEO FRAMES
// ═══════════════════════════════════════════════════════════════════

export async function generateNewAdVideoFrames(data: AdDesignData, duration: number = 30): Promise<Blob[]> {
  const frames: Blob[] = [];
  const fps = 24;
  const totalFrames = duration * fps;
  const config = TEMPLATE_CONFIGS['story'];

  for (let i = 0; i < totalFrames; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) continue;

    const progress = i / totalFrames;
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, config.width, config.height);
    gradient.addColorStop(0, data.colors.primary);
    gradient.addColorStop(1, data.colors.secondary);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);

    // Animated elements based on progress
    drawAnimatedElements(ctx, config.width, config.height, progress, data.colors);

    // Headline with fade-in
    ctx.globalAlpha = Math.min(1, progress * 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(config.width * 0.06)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(data.headline, config.width / 2, config.height * 0.25);

    // Feature reveal based on progress
    if (progress > 0.3 && data.body) {
      ctx.globalAlpha = Math.min(1, (progress - 0.3) * 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${Math.floor(config.width * 0.025)}px Arial`;
      ctx.fillText(data.body.substring(0, 50), config.width / 2, config.height * 0.5);
    }

    // CTA at the end
    if (progress > 0.8) {
      ctx.globalAlpha = Math.min(1, (progress - 0.8) * 5);
      const btnWidth = config.width * 0.35;
      const btnHeight = config.height * 0.06;
      const btnX = (config.width - btnWidth) / 2;
      const btnY = config.height * 0.7;
      
      ctx.fillStyle = data.colors.accent;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnWidth, btnHeight, btnHeight / 2);
      ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.floor(config.width * 0.025)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(data.cta, config.width / 2, btnY + btnHeight * 0.65);
    }

    ctx.globalAlpha = 1;

    // Convert frame to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.9);
    });
    frames.push(blob);
  }

  return frames;
}

function drawAnimatedElements(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, colors: any) {
  // Animated circle
  const radius = width * 0.1 * (0.5 + progress * 0.5);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + progress * 0.1})`;
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.15, radius, 0, Math.PI * 2);
  ctx.fill();

  // Animated line
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  ctx.globalAlpha = progress;
  ctx.beginPath();
  ctx.moveTo(width * 0.1, height * 0.42);
  ctx.lineTo(width * (0.1 + progress * 0.8), height * 0.42);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════════
// SAVE IMAGE AS DOWNLOAD
// ═══════════════════════════════════════════════════════════════════

export function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function imageToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
