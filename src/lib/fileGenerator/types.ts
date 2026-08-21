export type FileType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'csv' | 'txt' | 'json' | 'mp3' | 'mp4';

export interface FileContent {
  title: string;
  content: string;
  sections?: { heading: string; content: string }[];
  tables?: { headers: string[]; rows: string[][] }[];
  metadata?: Record<string, string>;
}
