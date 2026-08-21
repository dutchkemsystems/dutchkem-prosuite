import type { FileContent } from './types';

async function generateWithReplicate(file: FileContent): Promise<Blob | null> {
  const apiToken = import.meta.env.VITE_REPLICATE_API_TOKEN;
  if (!apiToken) return null;

  const prompt = file.title + '. ' + file.content.substring(0, 500);

  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': 'Token ' + apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '60452b7c5b8be7a0c7ae0ea5eac6fe0c4c5f4a2f4c4b5e5e5e5e5e5e5e5e5e5e',
        input: {
          prompt: prompt,
          num_frames: 49,
          fps: 8,
        },
      }),
    });

    if (!response.ok) return null;

    const prediction = await response.json();

    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000));
      const pollResponse = await fetch('https://api.replicate.com/v1/predictions/' + result.id, {
        headers: { 'Authorization': 'Token ' + apiToken },
      });
      result = await pollResponse.json();
    }

    if (result.status === 'succeeded' && result.output) {
      const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      const videoResponse = await fetch(videoUrl);
      return await videoResponse.blob();
    }

    return null;
  } catch (e) {
    console.error('Replicate error:', e);
    return null;
  }
}

async function generateWithHuggingFaceFree(file: FileContent): Promise<Blob | null> {
  const apiToken = import.meta.env.VITE_HUGGINGFACE_API_TOKEN;
  if (!apiToken) return null;

  const prompt = file.title + '. ' + file.content.substring(0, 500);

  const freeModels = [
    'stabilityai/stable-video-diffusion-img2vid-xt-1-1',
    'ali-vilab/text-to-video-ms-1.7b',
    'damo-vilab/text-to-video-ms-1.7b',
  ];

  for (const model of freeModels) {
    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/' + model,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              num_frames: 150,
              num_inference_steps: 25,
            }
          }),
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 1000) return blob;
      }
    } catch (e) {
      // Model failed, trying next
    }
  }

  return null;
}

async function generateWithReplicateFree(file: FileContent): Promise<Blob | null> {
  const apiToken = import.meta.env.VITE_REPLICATE_API_TOKEN;
  if (!apiToken) return null;

  const prompt = file.title + '. ' + file.content.substring(0, 500);

  const freeModels = [
    'anotherjesse/zeroscope-v2-xl',
    'wavespeedai/wavespeed-animo-v1-480p',
  ];

  for (const model of freeModels) {
    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + apiToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: model,
          input: {
            prompt: prompt,
            num_frames: 150,
          },
        }),
      });

      if (!response.ok) continue;

      const prediction = await response.json();

      let result = prediction;
      const startTime = Date.now();
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        if (Date.now() - startTime > 120000) break;
        await new Promise(r => setTimeout(r, 3000));
        const pollResponse = await fetch('https://api.replicate.com/v1/predictions/' + result.id, {
          headers: { 'Authorization': 'Token ' + apiToken },
        });
        result = await pollResponse.json();
      }

      if (result.status === 'succeeded' && result.output) {
        const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;
        const videoResponse = await fetch(videoUrl);
        return await videoResponse.blob();
      }
    } catch (e) {
      // Replicate model failed, trying next
    }
  }

  return null;
}

async function generateEnhancedCanvasSlideshow(file: FileContent): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d')!;

    const slides: Array<{
      title: string;
      content: string;
      bgColor: string;
      accentColor: string;
      duration: number;
      transition: string;
    }> = [];

    const bgColors = ['#0f0f23', '#1a1a2e', '#16213e', '#0f3460', '#1a1a3e'];
    const accentColors = ['#FF6B35', '#E94560', '#0F3460', '#533483', '#FF6B35'];

    slides.push({
      title: file.title,
      content: file.metadata ? Object.entries(file.metadata).map(([k, v]) => k + ': ' + v).join('\n') : '',
      bgColor: '#0f0f23',
      accentColor: '#FF6B35',
      duration: 5000,
      transition: 'fade',
    });

    const contentLines = file.content.split('\n').filter(l => l.trim());
    const linesPerSlide = 5;
    for (let i = 0; i < contentLines.length; i += linesPerSlide) {
      const slideIndex = Math.floor(i / linesPerSlide);
      slides.push({
        title: '',
        content: contentLines.slice(i, i + linesPerSlide).join('\n'),
        bgColor: bgColors[slideIndex % bgColors.length],
        accentColor: accentColors[slideIndex % accentColors.length],
        duration: 4000,
        transition: slideIndex % 2 === 0 ? 'slide' : 'fade',
      });
    }

    if (file.sections) {
      for (let i = 0; i < file.sections.length; i++) {
        const section = file.sections[i];
        slides.push({
          title: section.heading,
          content: section.content.substring(0, 400),
          bgColor: bgColors[i % bgColors.length],
          accentColor: accentColors[i % accentColors.length],
          duration: 5000,
          transition: 'zoom',
        });
      }
    }

    slides.push({
      title: 'Thank You',
      content: 'Generated by Dutchkem Ventures ProSuite NG+',
      bgColor: '#0f0f23',
      accentColor: '#FF6B35',
      duration: 4000,
      transition: 'fade',
    });

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
    });

    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };

    let currentSlide = 0;
    let frameCount = 0;
    const fps = 30;

    function drawFrame() {
      if (currentSlide >= slides.length) {
        mediaRecorder.stop();
        return;
      }

      const slide = slides[currentSlide];
      const slideFrames = Math.floor((slide.duration / 1000) * fps);
      const transitionProgress = Math.min(1, frameCount / (fps * 0.5));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, slide.bgColor);
      gradient.addColorStop(1, slide.accentColor + '33');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = slide.accentColor + '20';
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(frameCount * 0.01 + i) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(frameCount * 0.01 + i * 0.5) * 0.5 + 0.5) * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 30 + Math.sin(frameCount * 0.02 + i) * 10, 0, Math.PI * 2);
        ctx.fill();
      }

      if (slide.title) {
        ctx.fillStyle = slide.accentColor;
        ctx.font = 'bold ' + (56 + Math.sin(frameCount * 0.05) * 4) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(slide.title, canvas.width / 2, 120);

        const underlineWidth = Math.min(1, transitionProgress) * 300;
        ctx.fillStyle = slide.accentColor;
        ctx.fillRect(canvas.width / 2 - underlineWidth / 2, 140, underlineWidth, 4);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.min(1, transitionProgress) + ')';
      ctx.font = '28px Arial';
      ctx.textAlign = 'left';
      const lines = slide.content.split('\n');
      lines.forEach((line, i) => {
        const yOffset = 200 + (i * 50);
        const lineOpacity = Math.min(1, Math.max(0, transitionProgress - (i * 0.1)));
        ctx.fillStyle = 'rgba(255, 255, 255, ' + lineOpacity + ')';
        ctx.fillText(line.substring(0, 70), 100, yOffset);
      });

      ctx.fillStyle = '#666666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Dutchkem Ventures ProSuite NG+ | AI-Powered Video Production', canvas.width / 2, canvas.height - 50);

      ctx.fillStyle = slide.accentColor;
      ctx.font = 'bold 14px Arial';
      ctx.fillText((currentSlide + 1) + ' / ' + slides.length, canvas.width - 80, canvas.height - 30);

      const progress = (currentSlide / slides.length) * 100;
      ctx.fillStyle = '#333333';
      ctx.fillRect(50, canvas.height - 20, canvas.width - 100, 8);
      ctx.fillStyle = slide.accentColor;
      ctx.fillRect(50, canvas.height - 20, (canvas.width - 100) * (progress / 100), 8);

      frameCount++;

      if (frameCount >= slideFrames) {
        currentSlide++;
        frameCount = 0;
      }
    }

    mediaRecorder.start();

    const animationInterval = setInterval(() => {
      drawFrame();
      if (currentSlide >= slides.length) {
        clearInterval(animationInterval);
      }
    }, 1000 / fps);

    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        clearInterval(animationInterval);
        mediaRecorder.stop();
      }
    }, 300000);
  });
}

export async function generateMP4(file: FileContent): Promise<Blob> {
  try {
    const hfVideo = await generateWithHuggingFaceFree(file);
    if (hfVideo) return hfVideo;
  } catch (e) {
    // Hugging Face API limit reached
  }

  try {
    const replicateVideo = await generateWithReplicateFree(file);
    if (replicateVideo) return replicateVideo;
  } catch (e) {
    // Replicate free tier exhausted
  }

  return generateEnhancedCanvasSlideshow(file);
}
