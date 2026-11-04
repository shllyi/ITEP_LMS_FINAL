const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const JSZip = require('jszip');

/**
 * Extract raw text from a Buffer given a file's original name.
 * Supports: .pdf, .docx, .txt
 */
async function extractTextFromBuffer(buffer, originalname) {
  const ext = path.extname(originalname).toLowerCase();

  if (ext === '.pdf') {
    const result = await pdfParse(buffer);
    return result.text || '';
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (ext === '.txt') {
    return buffer.toString('utf8');
  }

  if (ext === '.pptx') {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const slideText = [];
    for (const fileName of slideFiles) {
      const xml = await zip.files[fileName].async('string');
      const text = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi)]
        .map(match => match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
        .join(' ')
        .trim();
      if (text) slideText.push(text);
    }
    return slideText.join('\n\n');
  }

  return ''; // unsupported type
}

module.exports = { extractTextFromBuffer };
