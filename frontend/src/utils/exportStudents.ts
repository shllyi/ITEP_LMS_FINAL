import { Platform } from 'react-native';

export interface ExportRow {
  no: number;
  tuptId: string;
  name: string;
  email: string;
  score: string;
  passed: string;
}

export interface ExportGroup {
  name: string;
  rows: ExportRow[];
}

export interface ExportData {
  title: string;
  subtitle: string;
  scoreLabel: string;
  groups: ExportGroup[];
}

const esc = (value: string) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fileBase = (data: ExportData) =>
  data.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'class_list';

const isWeb = () => Platform.OS === 'web' && typeof document !== 'undefined';

const download = (content: string, mime: string, fileName: string) => {
  if (!isWeb()) return false;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};

const buildBody = (data: ExportData) => {
  const sections = data.groups
    .map(group => {
      const rows = group.rows
        .map(
          r => `<tr>
            <td style="text-align:center">${r.no}</td>
            <td>${esc(r.tuptId || '')}</td>
            <td>${esc(r.name)}</td>
            <td>${esc(r.email)}</td>
            <td style="text-align:center">${esc(r.score)}</td>
            <td style="text-align:center">${esc(r.passed)}</td>
          </tr>`
        )
        .join('');
      return `
        <h2>${esc(group.name)} <span class="count">(${group.rows.length} student${group.rows.length === 1 ? '' : 's'})</span></h2>
        <table>
          <thead>
            <tr>
              <th style="width:6%">No.</th>
              <th style="width:16%">TUPT-ID</th>
              <th style="width:24%">Name</th>
              <th style="width:30%">Email</th>
              <th style="width:12%">${esc(data.scoreLabel)}</th>
              <th style="width:12%">Passed</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    })
    .join('');

  return `<h1>${esc(data.title)}</h1><p class="sub">${esc(data.subtitle)}</p>${sections}`;
};

const styleBlock = `
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0F172A; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 22px 0 6px; color: #134E4A; }
  .count { font-size: 12px; color: #475569; font-weight: normal; }
  .sub { font-size: 12px; color: #475569; margin: 0 0 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th { background: #134E4A; color: #FFFFFF; text-align: left; padding: 6px 8px; border: 1px solid #134E4A; }
  td { padding: 6px 8px; border: 1px solid #CBD5E1; }
  tr { page-break-inside: avoid; }
`;

export const exportPdf = (data: ExportData) => {
  if (!isWeb()) return false;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(data.title)}</title><style>${styleBlock}</style></head><body>${buildBody(data)}</body></html>`;
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
  return true;
};

export const exportWord = (data: ExportData) => {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(data.title)}</title><style>${styleBlock}</style></head><body>${buildBody(data)}</body></html>`;
  return download('\ufeff' + html, 'application/msword', `${fileBase(data)}.doc`);
};

export const exportCsv = (data: ExportData) => {
  const q = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines: string[] = [
    ['Section', 'No.', 'TUPT-ID', 'Name', 'Email', data.scoreLabel, 'Passed'].map(q).join(','),
  ];
  for (const group of data.groups) {
    for (const r of group.rows) {
      lines.push([group.name, r.no, r.tuptId, r.name, r.email, r.score, r.passed].map(q).join(','));
    }
  }
  return download('\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8', `${fileBase(data)}.csv`);
};
