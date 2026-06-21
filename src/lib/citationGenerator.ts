// ═══════════════════════════════════════════════════════════════════
// CITATION GENERATOR — APA, MLA, Chicago, Harvard, OSCOLA
// International Standards Compliant Citation Formatting
// ═══════════════════════════════════════════════════════════════════

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'oscola';

export interface Citation {
  type: 'book' | 'journal' | 'website' | 'article';
  authors: string[];
  title: string;
  year: number;
  publisher?: string;
  journal?: string;
  volume?: number;
  issue?: number;
  pages?: string;
  doi?: string;
  url?: string;
  accessedDate?: string;
}

// ═══════════════════════════════════════════════════════════════════
// APA 7TH EDITION CITATION GENERATOR
// ═══════════════════════════════════════════════════════════════════

export function generateAPA7(citation: Citation): string {
  const authors = formatAuthorsAPA7(citation.authors);
  const year = `(${citation.year})`;
  
  switch (citation.type) {
    case 'book':
      return `${authors} ${year}. *${citation.title}*. ${citation.publisher}.`;
    
    case 'journal':
      const journalPart = citation.journal ? `*${citation.journal}*` : '';
      const volumePart = citation.volume ? `, *${citation.volume}*` : '';
      const issuePart = citation.issue ? `(${citation.issue})` : '';
      const pagesPart = citation.pages ? `, ${citation.pages}` : '';
      const doiPart = citation.doi ? ` https://doi.org/${citation.doi}` : '';
      return `${authors} ${year}. ${citation.title}. ${journalPart}${volumePart}${issuePart}${pagesPart}.${doiPart}`;
    
    case 'website':
      const urlPart = citation.url || '';
      const accessedPart = citation.accessedDate ? `. Retrieved ${citation.accessedDate}` : '';
      return `${authors} ${year}. *${citation.title}*. ${urlPart}${accessedPart}`;
    
    case 'article':
      const articleJournal = citation.journal ? `*${citation.journal}*` : '';
      const articleVolume = citation.volume ? `, *${citation.volume}*` : '';
      const articleIssue = citation.issue ? `(${citation.issue})` : '';
      const articlePages = citation.pages ? `, ${citation.pages}` : '';
      const articleDoi = citation.doi ? ` https://doi.org/${citation.doi}` : '';
      return `${authors} ${year}. ${citation.title}. ${articleJournal}${articleVolume}${articleIssue}${articlePages}.${articleDoi}`;
    
    default:
      return `${authors} ${year}. *${citation.title}*.`;
  }
}

function formatAuthorsAPA7(authors: string[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  if (authors.length <= 20) {
    return `${authors.slice(0, -1).join(', ')}, & ${authors[authors.length - 1]}`;
  }
  return `${authors.slice(0, 19).join(', ')} ... ${authors[authors.length - 1]}`;
}

// ═══════════════════════════════════════════════════════════════════
// MLA HANDBOOK CITATION GENERATOR
// ═══════════════════════════════════════════════════════════════════

export function generateMLA(citation: Citation): string {
  const authors = formatAuthorsMLA(citation.authors);
  
  switch (citation.type) {
    case 'book':
      return `${authors}. *${citation.title}*. ${citation.publisher}, ${citation.year}.`;
    
    case 'journal':
      const journalPart = citation.journal ? `*${citation.journal}*` : '';
      const volumePart = citation.volume ? `, vol. ${citation.volume}` : '';
      const issuePart = citation.issue ? `, no. ${citation.issue}` : '';
      const pagesPart = citation.pages ? `, pp. ${citation.pages}` : '';
      return `${authors}. "${citation.title}." ${journalPart}${volumePart}${issuePart}${pagesPart}, ${citation.year}.`;
    
    case 'website':
      const urlPart = citation.url || '';
      const accessedPart = citation.accessedDate ? `. Accessed ${citation.accessedDate}` : '';
      return `${authors}. "${citation.title}." *Web*, ${citation.year}, ${urlPart}${accessedPart}.`;
    
    case 'article':
      const articleJournal = citation.journal ? `*${citation.journal}*` : '';
      const articleVolume = citation.volume ? `, vol. ${citation.volume}` : '';
      const articleIssue = citation.issue ? `, no. ${citation.issue}` : '';
      const articlePages = citation.pages ? `, pp. ${citation.pages}` : '';
      return `${authors}. "${citation.title}." ${articleJournal}${articleVolume}${articleIssue}${articlePages}, ${citation.year}.`;
    
    default:
      return `${authors}. *${citation.title}*. ${citation.year}.`;
  }
}

function formatAuthorsMLA(authors: string[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]}, and ${authors[1]}`;
  return `${authors[0]}, et al`;
}

// ═══════════════════════════════════════════════════════════════════
// CHICAGO MANUAL CITATION GENERATOR
// ═══════════════════════════════════════════════════════════════════

export function generateChicago(citation: Citation): string {
  const authors = formatAuthorsChicago(citation.authors);
  
  switch (citation.type) {
    case 'book':
      return `${authors}. *${citation.title}*. ${citation.publisher}, ${citation.year}.`;
    
    case 'journal':
      const journalPart = citation.journal ? `*${citation.journal}*` : '';
      const volumePart = citation.volume ? ` ${citation.volume}` : '';
      const issuePart = citation.issue ? `, no. ${citation.issue}` : '';
      const pagesPart = citation.pages ? `: ${citation.pages}` : '';
      return `${authors}. "${citation.title}." ${journalPart}${volumePart}${issuePart}${pagesPart} (${citation.year}).`;
    
    case 'website':
      const urlPart = citation.url || '';
      const accessedPart = citation.accessedDate ? `. Accessed ${citation.accessedDate}` : '';
      return `${authors}. "${citation.title}." Accessed ${citation.year}. ${urlPart}${accessedPart}.`;
    
    case 'article':
      const articleJournal = citation.journal ? `*${citation.journal}*` : 'Publication';
      const articleVolume = citation.volume ? ` ${citation.volume}` : '';
      const articleIssue = citation.issue ? `, no. ${citation.issue}` : '';
      const articlePages = citation.pages ? `: ${citation.pages}` : '';
      return `${authors}. "${citation.title}." ${articleJournal}${articleVolume}${articleIssue}${articlePages} (${citation.year}).`;
    
    default:
      return `${authors}. *${citation.title}*. ${citation.publisher}, ${citation.year}.`;
  }
}

function formatAuthorsChicago(authors: string[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]}, and ${authors[1]}`;
  if (authors.length <= 10) {
    return `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
  }
  return `${authors[0]} et al`;
}

// ═══════════════════════════════════════════════════════════════════
// HARVARD REFERENCING CITATION GENERATOR
// ═══════════════════════════════════════════════════════════════════

export function generateHarvard(citation: Citation): string {
  const authors = formatAuthorsHarvard(citation.authors);
  
  switch (citation.type) {
    case 'book':
      return `${authors} (${citation.year}) *${citation.title}*. ${citation.publisher}.`;
    
    case 'journal':
      const journalPart = citation.journal ? `*${citation.journal}*` : '';
      const volumePart = citation.volume ? `, ${citation.volume}` : '';
      const issuePart = citation.issue ? `(${citation.issue})` : '';
      const pagesPart = citation.pages ? `, pp. ${citation.pages}` : '';
      return `${authors} (${citation.year}) '${citation.title}', ${journalPart}${volumePart}${issuePart}${pagesPart}.`;
    
    case 'website':
      const urlPart = citation.url || '';
      const accessedPart = citation.accessedDate ? `. Available at: ${urlPart} (Accessed: ${citation.accessedDate})` : '';
      return `${authors} (${citation.year}) '${citation.title}'.${accessedPart}`;
    
    case 'article':
      const articleJournal = citation.journal ? `*${citation.journal}*` : '';
      const articleVolume = citation.volume ? `, ${citation.volume}` : '';
      const articleIssue = citation.issue ? `(${citation.issue})` : '';
      const articlePages = citation.pages ? `, pp. ${citation.pages}` : '';
      return `${authors} (${citation.year}) '${citation.title}', ${articleJournal}${articleVolume}${articleIssue}${articlePages}.`;
    
    default:
      return `${authors} (${citation.year}) *${citation.title}*. ${citation.publisher}.`;
  }
}

function formatAuthorsHarvard(authors: string[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
  return `${authors[0]} et al.`;
}

// ═══════════════════════════════════════════════════════════════════
// OSCOLA CITATION GENERATOR (Legal)
// ═══════════════════════════════════════════════════════════════════

export function generateOSCOLA(citation: Citation): string {
  const authors = formatAuthorsOSCOLA(citation.authors);
  
  switch (citation.type) {
    case 'book':
      return `${authors} *${citation.title}* (${citation.publisher} ${citation.year})`;
    
    case 'journal':
      const journalPart = citation.journal ? `*${citation.journal}*` : '';
      const volumePart = citation.volume ? ` ${citation.volume}` : '';
      const pagesPart = citation.pages ? ` ${citation.pages}` : '';
      return `${authors} '${citation.title}' ${journalPart}${volumePart}${pagesPart} (${citation.year}).`;
    
    case 'website':
      const urlPart = citation.url || '';
      const accessedPart = citation.accessedDate ? ` (accessed ${citation.accessedDate})` : '';
      return `${authors} '${citation.title}' (${citation.year}) ${urlPart}${accessedPart}.`;
    
    default:
      return `${authors} *${citation.title}* (${citation.publisher} ${citation.year})`;
  }
}

function formatAuthorsOSCOLA(authors: string[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
  return `${authors[0]} and others`;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN CITATION GENERATOR
// ═══════════════════════════════════════════════════════════════════

export function generateCitation(citation: Citation, style: CitationStyle): string {
  switch (style) {
    case 'apa':
      return generateAPA7(citation);
    case 'mla':
      return generateMLA(citation);
    case 'chicago':
      return generateChicago(citation);
    case 'harvard':
      return generateHarvard(citation);
    case 'oscola':
      return generateOSCOLA(citation);
    default:
      return generateAPA7(citation);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BATCH CITATION GENERATOR
// ═══════════════════════════════════════════════════════════════════

export function generateBibliography(citations: Citation[], style: CitationStyle): string {
  const formatted = citations.map(c => generateCitation(c, style));
  
  switch (style) {
    case 'apa':
      return `References\n\n${formatted.sort().join('\n\n')}`;
    case 'mla':
      return `Works Cited\n\n${formatted.sort().join('\n\n')}`;
    case 'chicago':
      return `Bibliography\n\n${formatted.sort().join('\n\n')}`;
    case 'harvard':
      return `Reference List\n\n${formatted.sort().join('\n\n')}`;
    case 'oscola':
      return `Table of Authorities\n\n${formatted.join('\n')}`;
    default:
      return formatted.join('\n\n');
  }
}

// ═══════════════════════════════════════════════════════════════════
// CITATION VALIDATOR
// ═══════════════════════════════════════════════════════════════════

export function validateCitation(citation: Citation): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!citation.authors || citation.authors.length === 0) {
    errors.push('At least one author is required');
  }
  
  if (!citation.title) {
    errors.push('Title is required');
  }
  
  if (!citation.year || citation.year < 1000 || citation.year > new Date().getFullYear() + 1) {
    errors.push('Valid year is required');
  }
  
  if (citation.type === 'journal' && !citation.journal) {
    errors.push('Journal name is required for journal articles');
  }
  
  if (citation.type === 'book' && !citation.publisher) {
    errors.push('Publisher is required for books');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXAMPLE CITATIONS FOR TESTING
// ═══════════════════════════════════════════════════════════════════

export const exampleCitations: Citation[] = [
  {
    type: 'book',
    authors: ['Smith, J.', 'Johnson, M.'],
    title: 'Introduction to Artificial Intelligence',
    year: 2024,
    publisher: 'Oxford University Press',
  },
  {
    type: 'journal',
    authors: ['Williams, A.', 'Brown, B.', 'Davis, C.'],
    title: 'Machine Learning in Healthcare',
    year: 2023,
    journal: 'Journal of Medical Informatics',
    volume: 45,
    issue: 2,
    pages: '123-145',
    doi: '10.1234/jmi.2023.45.2.123',
  },
  {
    type: 'website',
    authors: ['Nigerian National Bureau of Statistics'],
    title: 'Nigeria GDP Report 2024',
    year: 2024,
    url: 'https://nigerianstat.gov.ng/gdp-report',
    accessedDate: '15 January 2024',
  },
  {
    type: 'article',
    authors: ['Okafor, N.', 'Adeyemi, T.'],
    title: 'Digital Transformation in Nigerian Banking',
    year: 2023,
    journal: 'African Journal of Business Management',
    volume: 17,
    issue: 3,
    pages: '89-102',
    doi: '10.5897/ajbm2023.1234',
  },
];
