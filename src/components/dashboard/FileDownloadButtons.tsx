import { useState } from 'react'
import {
  generatePDF,
  generateDOCX,
  generateXLSX,
  generatePPTX,
  generateCSV,
  generateTXT,
  generateJSON,
  generateMP3,
  generateMP4,
  downloadFile,
  parseAIResponseToContent,
  type FileType,
} from '~/lib/fileGenerator'
import {
  verifyAgentOutput,
  autoFixStandards,
  formatCurrency,
  formatDate,
  type Currency,
  type Locale,
} from '~/lib/internationalStandards'

interface FileDownloadButtonsProps {
  content: string
  agentType: string
  title?: string
}

export function FileDownloadButtons({ content, agentType, title }: FileDownloadButtonsProps) {
  const [isGenerating, setIsGenerating] = useState<FileType | null>(null)
  const [showFormatMenu, setShowFormatMenu] = useState(false)

  const [standardsResult, setStandardsResult] = useState<any>(null)

  const handleDownload = async (type: FileType) => {
    setIsGenerating(type)
    setShowFormatMenu(false)

    try {
      const fileTitle = title || `${agentType} Output`
      
      // Apply standards auto-fix
      const fixedContent = autoFixStandards(content, 'ISO_8601')
      const fixedContent2 = autoFixStandards(fixedContent, 'ISO_4217')
      
      const fileContent = parseAIResponseToContent(fileTitle, fixedContent2, agentType)
      
      // Verify standards compliance
      const agentId = agentType.includes('Academic') ? 'A1' :
                     agentType.includes('Business') ? 'A2' :
                     agentType.includes('Content') ? 'A3' :
                     agentType.includes('Career') ? 'A4' :
                     agentType.includes('Shop') ? 'A5' :
                     agentType.includes('Exam') ? 'A6' :
                     agentType.includes('Finance') ? 'A7' :
                     agentType.includes('Media') || agentType.includes('Video') ? 'A8' :
                     agentType.includes('Wellness') ? 'A9' :
                     agentType.includes('Home') ? 'A10' :
                     agentType.includes('Language') ? 'A11' :
                     agentType.includes('Travel') ? 'A12' :
                     agentType.includes('Translation') ? 'A14' :
                     agentType.includes('Event') ? 'A15' : 'A1'
      
      const verification = verifyAgentOutput(agentId, fixedContent2)
      setStandardsResult(verification)

      let blob: Blob
      switch (type) {
        case 'pdf':
          blob = await generatePDF(fileContent)
          break
        case 'docx':
          blob = await generateDOCX(fileContent)
          break
        case 'xlsx':
          blob = await generateXLSX(fileContent)
          break
        case 'pptx':
          blob = await generatePPTX(fileContent)
          break
        case 'csv':
          blob = generateCSV(fileContent)
          break
        case 'txt':
          blob = generateTXT(fileContent)
          break
        case 'json':
          blob = generateJSON(fileContent)
          break
        case 'mp3':
          blob = await generateMP3(fileContent)
          break
        case 'mp4':
          blob = await generateMP4(fileContent)
          break
        default:
          throw new Error('Unknown file type')
      }

      downloadFile(blob, `${fileTitle.replace(/\s+/g, '_')}_${Date.now()}`, type)
    } catch (err) {
      console.error('File generation error:', err)
    } finally {
      setIsGenerating(null)
    }
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        onClick={() => setShowFormatMenu(!showFormatMenu)}
        disabled={isGenerating !== null}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-slate-300 transition-all disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin">⟳</span>
            Generating...
          </>
        ) : (
          <>
            <span>📥</span>
            Download
          </>
        )}
      </button>

      {/* Standards Compliance Badge */}
      {standardsResult && (
        <div className={`px-2 py-1 rounded text-[10px] font-bold ${
          standardsResult.compliant 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>
          {standardsResult.compliant ? '✓ ISO Compliant' : `${standardsResult.overallScore}% Compliant`}
        </div>
      )}

      {showFormatMenu && (
        <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 w-64">
          <div className="p-2 border-b border-white/10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Document Formats</p>
          </div>
          <button
            onClick={() => handleDownload('pdf')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-red-400">📄</span>
            <span>PDF Document</span>
          </button>
          <button
            onClick={() => handleDownload('docx')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-blue-400">📝</span>
            <span>Word Document</span>
          </button>
          <button
            onClick={() => handleDownload('pptx')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-orange-400">📊</span>
            <span>PowerPoint</span>
          </button>
          
          <div className="p-2 border-b border-t border-white/10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Data Formats</p>
          </div>
          <button
            onClick={() => handleDownload('xlsx')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-emerald-400">📗</span>
            <span>Excel Spreadsheet</span>
          </button>
          <button
            onClick={() => handleDownload('csv')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-cyan-400">📋</span>
            <span>CSV Data</span>
          </button>
          
          <div className="p-2 border-b border-t border-white/10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Text Formats</p>
          </div>
          <button
            onClick={() => handleDownload('txt')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-slate-400">📃</span>
            <span>Plain Text</span>
          </button>
          <button
            onClick={() => handleDownload('json')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-yellow-400">🔧</span>
            <span>JSON Data</span>
          </button>
          
          <div className="p-2 border-b border-t border-white/10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Media Formats</p>
          </div>
          <button
            onClick={() => handleDownload('mp3')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-pink-400">🎵</span>
            <span>Audio (Text-to-Speech)</span>
          </button>
          <button
            onClick={() => handleDownload('mp4')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-purple-400">🎬</span>
            <span>Video Presentation</span>
          </button>
        </div>
      )}
    </div>
  )
}
