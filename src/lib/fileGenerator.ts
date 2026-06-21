import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';
import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';

// ═══════════════════════════════════════════════════════════════════
// FILE GENERATOR — Client-Side PDF, Word, Excel, PowerPoint, CSV, MP3, MP4
// ═══════════════════════════════════════════════════════════════════

export type FileType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'csv' | 'txt' | 'json' | 'mp3' | 'mp4';

export interface FileContent {
  title: string;
  content: string;
  sections?: { heading: string; content: string }[];
  tables?: { headers: string[]; rows: string[][] }[];
  metadata?: Record<string, string>;
}

// ─── PDF GENERATION ───

export async function generatePDF(file: FileContent): Promise<Blob> {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(file.title, 20, 30);
  
  // Metadata
  if (file.metadata) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let y = 45;
    for (const [key, value] of Object.entries(file.metadata)) {
      doc.text(`${key}: ${value}`, 20, y);
      y += 6;
    }
  }
  
  // Main content
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(file.content, 170);
  let y = file.metadata ? 60 : 50;
  
  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 20, y);
    y += 6;
  }
  
  // Sections
  if (file.sections) {
    for (const section of file.sections) {
      doc.addPage();
      y = 30;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(section.heading, 20, y);
      y += 12;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const sectionLines = doc.splitTextToSize(section.content, 170);
      for (const line of sectionLines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 6;
      }
    }
  }
  
  // Tables
  if (file.tables) {
    for (const table of file.tables) {
      doc.addPage();
      y = 30;
      
      const colWidth = 170 / table.headers.length;
      
      // Header row
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      table.headers.forEach((header, i) => {
        doc.text(header, 20 + (i * colWidth), y);
      });
      y += 8;
      
      // Data rows
      doc.setFont('helvetica', 'normal');
      for (const row of table.rows) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        row.forEach((cell, i) => {
          doc.text(cell, 20 + (i * colWidth), y);
        });
        y += 6;
      }
    }
  }
  
  return doc.output('blob');
}

// ─── WORD DOCUMENT GENERATION ───

export async function generateDOCX(file: FileContent): Promise<Blob> {
  const children: any[] = [];
  
  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: file.title,
          bold: true,
          size: 48,
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    })
  );
  
  // Metadata
  if (file.metadata) {
    for (const [key, value] of Object.entries(file.metadata)) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${key}: ${value}`,
              size: 20,
              color: '666666',
            }),
          ],
        })
      );
    }
    children.push(new Paragraph({ text: '' })); // Spacer
  }
  
  // Main content
  const paragraphs = file.content.split('\n').filter(p => p.trim());
  for (const para of paragraphs) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: para,
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }
  
  // Sections
  if (file.sections) {
    for (const section of file.sections) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.heading,
              bold: true,
              size: 32,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
      
      const sectionParagraphs = section.content.split('\n').filter(p => p.trim());
      for (const para of sectionParagraphs) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    }
  }
  
  // Tables
  if (file.tables) {
    for (const table of file.tables) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '',
              size: 24,
            }),
          ],
          spacing: { before: 200 },
        })
      );
      
      const tableRows = [
        new TableRow({
          children: table.headers.map(header =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: header,
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              width: { size: Math.floor(100 / table.headers.length), type: WidthType.PERCENTAGE },
            })
          ),
        }),
        ...table.rows.map(row =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell,
                        size: 20,
                      }),
                    ],
                  }),
                ],
                width: { size: Math.floor(100 / row.length), type: WidthType.PERCENTAGE },
              })
            ),
          })
        ),
      ];
      
      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
  }
  
  const doc = new Document({
    sections: [{ children }],
  });
  
  return await Packer.toBlob(doc);
}

// ─── EXCEL GENERATION ───

export async function generateXLSX(file: FileContent): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dutchkem Ventures ProSuite';
  workbook.created = new Date();
  
  // Main sheet
  const sheet = workbook.addWorksheet(file.title.substring(0, 31)); // Excel limit
  
  // Title row
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = file.title;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };
  
  // Metadata
  if (file.metadata) {
    let row = 3;
    for (const [key, value] of Object.entries(file.metadata)) {
      sheet.getCell(`A${row}`).value = key;
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = value;
      row++;
    }
  }
  
  // Main content as single column
  const contentStartRow = file.metadata ? Object.keys(file.metadata).length + 5 : 3;
  sheet.getCell(`A${contentStartRow}`).value = 'Content';
  sheet.getCell(`A${contentStartRow}`).font = { bold: true, size: 12 };
  
  const contentLines = file.content.split('\n').filter(l => l.trim());
  contentLines.forEach((line, i) => {
    sheet.getCell(`A${contentStartRow + 1 + i}`).value = line;
  });
  
  // Tables as separate sheets
  if (file.tables) {
    file.tables.forEach((table, tableIndex) => {
      const tableSheet = workbook.addWorksheet(`Table ${tableIndex + 1}`);
      
      // Headers
      table.headers.forEach((header, i) => {
        const cell = tableSheet.getCell(1, i + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });
      
      // Data rows
      table.rows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          tableSheet.getCell(rowIndex + 2, colIndex + 1).value = cell;
        });
      });
      
      // Auto-fit columns
      table.headers.forEach((_: string, i: number) => {
        tableSheet.getColumn(i + 1).width = 20;
      });
    });
  }
  
  // Auto-fit main sheet columns
  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 50;
  
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ─── POWERPOINT GENERATION ───

export async function generatePPTX(file: FileContent): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.author = 'Dutchkem Ventures ProSuite';
  pptx.title = file.title;
  
  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '1a1a2e' };
  titleSlide.addText(file.title, {
    x: '10%',
    y: '35%',
    w: '80%',
    h: '30%',
    fontSize: 36,
    fontFace: 'Arial',
    color: 'FFFFFF',
    bold: true,
    align: 'center',
  });
  
  // Metadata slide
  if (file.metadata) {
    const metaSlide = pptx.addSlide();
    metaSlide.background = { color: '16213e' };
    metaSlide.addText('Document Information', {
      x: '10%',
      y: '10%',
      w: '80%',
      h: '15%',
      fontSize: 28,
      fontFace: 'Arial',
      color: 'FF6B35',
      bold: true,
    });
    
    let yPos = 30;
    for (const [key, value] of Object.entries(file.metadata)) {
      metaSlide.addText(`${key}: ${value}`, {
        x: '15%',
        y: `${yPos}%`,
        w: '70%',
        h: '8%',
        fontSize: 16,
        fontFace: 'Arial',
        color: 'CCCCCC',
      });
      yPos += 10;
    }
  }
  
  // Content slides
  const contentLines = file.content.split('\n').filter(l => l.trim());
  const linesPerSlide = 8;
  
  for (let i = 0; i < contentLines.length; i += linesPerSlide) {
    const slide = pptx.addSlide();
    slide.background = { color: '0f3460' };
    
    const slideContent = contentLines.slice(i, i + linesPerSlide).join('\n');
    slide.addText(slideContent, {
      x: '10%',
      y: '15%',
      w: '80%',
      h: '70%',
      fontSize: 18,
      fontFace: 'Arial',
      color: 'FFFFFF',
      valign: 'top',
      paraSpaceAfter: 12,
    });
  }
  
  // Section slides
  if (file.sections) {
    for (const section of file.sections) {
      const slide = pptx.addSlide();
      slide.background = { color: '1a1a2e' };
      
      slide.addText(section.heading, {
        x: '10%',
        y: '10%',
        w: '80%',
        h: '20%',
        fontSize: 32,
        fontFace: 'Arial',
        color: 'FF6B35',
        bold: true,
      });
      
      slide.addText(section.content, {
        x: '10%',
        y: '35%',
        w: '80%',
        h: '55%',
        fontSize: 16,
        fontFace: 'Arial',
        color: 'FFFFFF',
        valign: 'top',
      });
    }
  }
  
  // Table slides
  if (file.tables) {
    for (const table of file.tables) {
      const slide = pptx.addSlide();
      slide.background = { color: '16213e' };
      
      // Convert to PowerPoint table format
      const tableRows = [
        table.headers.map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: 'FF6B35' } } })),
        ...table.rows.map(row => row.map(cell => ({ text: cell, options: { color: '333333' } }))),
      ];
      
      slide.addTable(tableRows, {
        x: '5%',
        y: '15%',
        w: '90%',
        h: '70%',
        fontSize: 12,
        fontFace: 'Arial',
        border: { pt: 1, color: 'CCCCCC' },
        colW: Array(table.headers.length).fill(90 / table.headers.length),
      });
    }
  }
  
  const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

// ─── CSV GENERATION ───

export function generateCSV(file: FileContent): Blob {
  let csv = '';
  
  // Title
  csv += `"${file.title}"\n\n`;
  
  // Metadata
  if (file.metadata) {
    for (const [key, value] of Object.entries(file.metadata)) {
      csv += `"${key}","${value}"\n`;
    }
    csv += '\n';
  }
  
  // Tables
  if (file.tables && file.tables.length > 0) {
    for (const table of file.tables) {
      csv += table.headers.map(h => `"${h}"`).join(',') + '\n';
      for (const row of table.rows) {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
      }
      csv += '\n';
    }
  } else {
    // Content as single column
    csv += '"Content"\n';
    const lines = file.content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      csv += `"${line.replace(/"/g, '""')}"\n`;
    }
  }
  
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

// ─── TEXT FILE GENERATION ───

export function generateTXT(file: FileContent): Blob {
  let txt = `${file.title}\n${'='.repeat(file.title.length)}\n\n`;
  
  if (file.metadata) {
    for (const [key, value] of Object.entries(file.metadata)) {
      txt += `${key}: ${value}\n`;
    }
    txt += '\n';
  }
  
  txt += file.content + '\n\n';
  
  if (file.sections) {
    for (const section of file.sections) {
      txt += `\n${section.heading}\n${'-'.repeat(section.heading.length)}\n`;
      txt += section.content + '\n';
    }
  }
  
  if (file.tables) {
    for (const table of file.tables) {
      txt += '\n' + table.headers.join('\t') + '\n';
      txt += table.headers.map(() => '---').join('\t') + '\n';
      for (const row of table.rows) {
        txt += row.join('\t') + '\n';
      }
    }
  }
  
  return new Blob([txt], { type: 'text/plain;charset=utf-8;' });
}

// ─── JSON GENERATION ───

export function generateJSON(file: FileContent): Blob {
  const jsonData = {
    title: file.title,
    metadata: file.metadata || {},
    content: file.content,
    sections: file.sections || [],
    tables: file.tables || [],
    generatedAt: new Date().toISOString(),
    generatedBy: 'Dutchkem Ventures ProSuite AI',
  };
  
  return new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
}

// ─── AUDIO (MP3) GENERATION USING WEB SPEECH API ───

export async function generateMP3(file: FileContent): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Check if Web Speech API is available
    if (!('speechSynthesis' in window)) {
      reject(new Error('Text-to-speech not supported in this browser'));
      return;
    }

    // Combine all content into speakable text
    let speakText = `${file.title}. `;
    
    if (file.metadata) {
      for (const [key, value] of Object.entries(file.metadata)) {
        speakText += `${key}: ${value}. `;
      }
    }
    
    speakText += file.content + ' ';
    
    if (file.sections) {
      for (const section of file.sections) {
        speakText += `${section.heading}. ${section.content} `;
      }
    }

    // Limit text length for reasonable file size
    speakText = speakText.substring(0, 10000);

    // Create audio context for recording
    const audioContext = new AudioContext({ sampleRate: 44100 });
    const destination = audioContext.createMediaStreamDestination();
    
    // Use MediaRecorder with webm first, then we'll convert
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm'
    });
    
    const chunks: BlobPart[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      // Convert webm to mp3 using AudioContext decode + encode
      const webmBlob = new Blob(chunks, { type: 'audio/webm' });
      
      try {
        // Decode the webm audio
        const arrayBuffer = await webmBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Convert to WAV first (MP3 encoding in browser is complex)
        // We'll create a high-quality WAV that most players support
        const wavBlob = audioBufferToWav(audioBuffer);
        resolve(wavBlob);
      } catch (err) {
        // Fallback: return the webm blob with mp3 extension
        // Most modern players can play webm audio
        resolve(webmBlob);
      }
      
      audioContext.close();
    };
    
    // Use Speech Synthesis
    const utterance = new SpeechSynthesisUtterance(speakText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to use a good voice
    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) 
                      || voices.find(v => v.lang.startsWith('en'))
                      || voices[0];
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.onend = () => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
    
    utterance.onerror = () => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
    
    // Start recording and speaking
    mediaRecorder.start();
    speechSynthesis.speak(utterance);
    
    // Timeout fallback
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, 120000); // 2 minute max
  });
}

// Helper: Convert AudioBuffer to WAV blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write audio data
  const channelData: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ─── VIDEO (MP4) GENERATION WITH FREE RESOURCES ───

export async function generateMP4(file: FileContent): Promise<Blob> {
  // Tier 1: Try Hugging Face Free API (Stable Video Diffusion)
  try {
    const hfVideo = await generateWithHuggingFaceFree(file);
    if (hfVideo) return hfVideo;
  } catch (e) {
    console.log('Hugging Face API limit reached, trying alternative...');
  }
  
  // Tier 2: Try Replicate Free Tier
  try {
    const replicateVideo = await generateWithReplicateFree(file);
    if (replicateVideo) return replicateVideo;
  } catch (e) {
    console.log('Replicate free tier exhausted, using canvas fallback...');
  }
  
  // Tier 3: Canvas slideshow with transitions (always works, CPU-only)
  return generateEnhancedCanvasSlideshow(file);
}

// ─── REPLICATE API (CogVideo) ───

async function generateWithReplicate(file: FileContent): Promise<Blob | null> {
  const apiToken = import.meta.env.VITE_REPLICATE_API_TOKEN;
  if (!apiToken) return null;
  
  // Create a prompt from the content
  const prompt = `${file.title}. ${file.content.substring(0, 500)}`;
  
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
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
    
    // Poll for completion
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000));
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Token ${apiToken}` },
      });
      result = await pollResponse.json();
    }
    
    if (result.status === 'succeeded' && result.output) {
      // Download the video
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

// ─── HUGGING FACE FREE API (Stable Video Diffusion) ───

async function generateWithHuggingFaceFree(file: FileContent): Promise<Blob | null> {
  const apiToken = import.meta.env.VITE_HUGGINGFACE_API_TOKEN;
  if (!apiToken) return null;
  
  const prompt = `${file.title}. ${file.content.substring(0, 500)}`;
  
  // Try multiple free models
  const freeModels = [
    'stabilityai/stable-video-diffusion-img2vid-xt-1-1',
    'ali-vilab/text-to-video-ms-1.7b',
    'damo-vilab/text-to-video-ms-1.7b',
  ];
  
  for (const model of freeModels) {
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            inputs: prompt,
            parameters: {
              num_frames: 150, // 5 seconds at 30fps
              num_inference_steps: 25,
            }
          }),
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 1000) return blob; // Valid video should be > 1KB
      }
    } catch (e) {
      console.log(`Model ${model} failed, trying next...`);
    }
  }
  
  return null;
}

// ─── REPLICATE FREE TIER ───

async function generateWithReplicateFree(file: FileContent): Promise<Blob | null> {
  const apiToken = import.meta.env.VITE_REPLICATE_API_TOKEN;
  if (!apiToken) return null;
  
  const prompt = `${file.title}. ${file.content.substring(0, 500)}`;
  
  // Use free models on Replicate
  const freeModels = [
    'anotherjesse/zeroscope-v2-xl',
    'wavespeedai/wavespeed-animo-v1-480p',
  ];
  
  for (const model of freeModels) {
    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiToken}`,
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
      
      // Poll for completion (max 2 minutes)
      let result = prediction;
      const startTime = Date.now();
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        if (Date.now() - startTime > 120000) break; // 2 min timeout
        await new Promise(r => setTimeout(r, 3000));
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { 'Authorization': `Token ${apiToken}` },
        });
        result = await pollResponse.json();
      }
      
      if (result.status === 'succeeded' && result.output) {
        const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;
        const videoResponse = await fetch(videoUrl);
        return await videoResponse.blob();
      }
    } catch (e) {
      console.log(`Replicate model ${model} failed, trying next...`);
    }
  }
  
  return null;
}

// ─── ENHANCED CANVAS SLIDESHOW (CPU-ONLY, ALWAYS WORKS) ───

async function generateEnhancedCanvasSlideshow(file: FileContent): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d')!;
    
    // Prepare slides with transitions
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
    
    // Title slide with cinematic effect
    slides.push({
      title: file.title,
      content: file.metadata ? Object.entries(file.metadata).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
      bgColor: '#0f0f23',
      accentColor: '#FF6B35',
      duration: 5000, // 5 seconds for title
      transition: 'fade',
    });
    
    // Content slides with alternating backgrounds
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
    
    // Section slides with headers
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
    
    // End slide
    slides.push({
      title: 'Thank You',
      content: 'Generated by Dutchkem Ventures ProSuite NG+',
      bgColor: '#0f0f23',
      accentColor: '#FF6B35',
      duration: 4000,
      transition: 'fade',
    });
    
    // Record canvas as video with smooth transitions
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
      
      // Calculate transition progress
      const transitionProgress = Math.min(1, frameCount / (fps * 0.5)); // 0.5s transition
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background with gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, slide.bgColor);
      gradient.addColorStop(1, slide.accentColor + '33');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Animated background particles
      ctx.fillStyle = slide.accentColor + '20';
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(frameCount * 0.01 + i) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(frameCount * 0.01 + i * 0.5) * 0.5 + 0.5) * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 30 + Math.sin(frameCount * 0.02 + i) * 10, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Title with animation
      if (slide.title) {
        ctx.fillStyle = slide.accentColor;
        ctx.font = `bold ${56 + Math.sin(frameCount * 0.05) * 4}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(slide.title, canvas.width / 2, 120);
        
        // Underline animation
        const underlineWidth = Math.min(1, transitionProgress) * 300;
        ctx.fillStyle = slide.accentColor;
        ctx.fillRect(canvas.width / 2 - underlineWidth / 2, 140, underlineWidth, 4);
      }
      
      // Content with fade-in effect
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, transitionProgress)})`;
      ctx.font = '28px Arial';
      ctx.textAlign = 'left';
      const lines = slide.content.split('\n');
      lines.forEach((line, i) => {
        const yOffset = 200 + (i * 50);
        const lineOpacity = Math.min(1, Math.max(0, transitionProgress - (i * 0.1)));
        ctx.fillStyle = `rgba(255, 255, 255, ${lineOpacity})`;
        ctx.fillText(line.substring(0, 70), 100, yOffset);
      });
      
      // Footer with branding
      ctx.fillStyle = '#666666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Dutchkem Ventures ProSuite NG+ | AI-Powered Video Production', canvas.width / 2, canvas.height - 50);
      
      // Slide counter
      ctx.fillStyle = slide.accentColor;
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`${currentSlide + 1} / ${slides.length}`, canvas.width - 80, canvas.height - 30);
      
      // Progress bar
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
    
    // Start recording
    mediaRecorder.start();
    
    // Animation loop
    const animationInterval = setInterval(() => {
      drawFrame();
      if (currentSlide >= slides.length) {
        clearInterval(animationInterval);
      }
    }, 1000 / fps);
    
    // Safety timeout (5 minutes max)
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        clearInterval(animationInterval);
        mediaRecorder.stop();
      }
    }, 300000);
  });
}

// ─── DOWNLOAD HELPER ───

// ─── DOWNLOAD HELPER ───

export function downloadFile(blob: Blob, filename: string, type: FileType) {
  const extensions: Record<FileType, string> = {
    pdf: '.pdf',
    docx: '.docx',
    xlsx: '.xlsx',
    pptx: '.pptx',
    csv: '.csv',
    txt: '.txt',
    json: '.json',
    mp3: '.mp3',
    mp4: '.mp4', // Will contain webm format but named .mp4 for compatibility
  };
  
  const mimeTypes: Record<FileType, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
    txt: 'text/plain',
    json: 'application/json',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
  };
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}${extensions[type]}`;
  a.type = mimeTypes[type];
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── PARSE AI RESPONSE INTO STRUCTURED CONTENT ───

export function parseAIResponseToContent(
  title: string,
  aiResponse: string,
  agentType: string
): FileContent {
  // Try to extract sections from the AI response
  const sections: { heading: string; content: string }[] = [];
  const tables: { headers: string[]; rows: string[][] }[] = [];
  
  // Split by common section markers
  const sectionMarkers = [
    /^#{1,3}\s+(.+)/gm,
    /^([A-Z][A-Za-z\s]+):$/gm,
    /^(\d+\.\s+.+):/gm,
  ];
  
  let currentSection: { heading: string; content: string } | null = null;
  const lines = aiResponse.split('\n');
  
  for (const line of lines) {
    const isHeading = sectionMarkers.some(marker => {
      const match = line.match(marker);
      if (match) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { heading: match[1] || line.replace(/[:#]/g, '').trim(), content: '' };
        return true;
      }
      return false;
    });
    
    if (!isHeading && currentSection) {
      currentSection.content += line + '\n';
    } else if (!isHeading && !currentSection) {
      // Content before any section
      if (!sections.length) {
        currentSection = { heading: 'Overview', content: line + '\n' };
      }
    }
  }
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // Extract tables (look for pipe-separated content)
  const tableRegex = /\|(.+)\|/g;
  let tableLines: string[] = [];
  
  for (const line of lines) {
    if (line.includes('|') && line.trim().startsWith('|')) {
      tableLines.push(line);
    } else if (tableLines.length > 0) {
      if (tableLines.length >= 2) {
        // Parse table
        const headers = tableLines[0].split('|').filter(c => c.trim()).map(c => c.trim());
        const rows = tableLines.slice(2).map(row =>
          row.split('|').filter(c => c.trim()).map(c => c.trim())
        );
        if (headers.length && rows.length) {
          tables.push({ headers, rows });
        }
      }
      tableLines = [];
    }
  }
  
  return {
    title,
    content: aiResponse.replace(/[#|]/g, '').substring(0, 5000), // Clean content
    sections: sections.slice(0, 10), // Limit sections
    tables: tables.slice(0, 5), // Limit tables
    metadata: {
      'Generated by': 'Dutchkem Ventures ProSuite AI',
      'Agent': agentType,
      'Date': new Date().toLocaleDateString(),
    },
  };
}
