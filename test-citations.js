// Test Citation Generator for All Styles

// Example citations
const exampleCitations = [
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

// Citation generators
function formatAuthorsAPA7(authors) {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  if (authors.length <= 20) {
    return `${authors.slice(0, -1).join(', ')}, & ${authors[authors.length - 1]}`;
  }
  return `${authors.slice(0, 19).join(', ')} ... ${authors[authors.length - 1]}`;
}

function generateAPA7(citation) {
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
    default:
      return `${authors} ${year}. *${citation.title}*.`;
  }
}

function formatAuthorsMLA(authors) {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]}, and ${authors[1]}`;
  return `${authors[0]}, et al.`;
}

function generateMLA(citation) {
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
      return `${authors}. "${citation.title}." *Web*, ${citation.year}, ${urlPart}.`;
    default:
      return `${authors}. *${citation.title}*. ${citation.year}.`;
  }
}

function formatAuthorsChicago(authors) {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]}, and ${authors[1]}`;
  if (authors.length <= 10) {
    return `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
  }
  return `${authors[0]} et al.`;
}

function generateChicago(citation) {
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
      return `${authors}. "${citation.title}." Accessed ${citation.year}. ${urlPart}.`;
    default:
      return `${authors}. *${citation.title}*. ${citation.publisher}, ${citation.year}.`;
  }
}

function formatAuthorsHarvard(authors) {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
  return `${authors[0]} et al.`;
}

function generateHarvard(citation) {
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
      return `${authors} (${citation.year}) '${citation.title}'. Available at: ${urlPart}.`;
    default:
      return `${authors} (${citation.year}) *${citation.title}*. ${citation.publisher}.`;
  }
}

// Run tests
console.log('=== CITATION GENERATOR TEST ===\n');

const styles = ['APA 7th', 'MLA', 'Chicago', 'Harvard'];
const generators = [generateAPA7, generateMLA, generateChicago, generateHarvard];

styles.forEach((style, styleIndex) => {
  console.log(`\n=== ${style} FORMAT ===\n`);
  
  exampleCitations.forEach((citation, i) => {
    const result = generators[styleIndex](citation);
    console.log(`Citation ${i + 1} (${citation.type}):`);
    console.log(`  ${result}`);
    console.log('');
  });
});

console.log('\n=== TEST COMPLETE ===');
