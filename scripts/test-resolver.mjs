import { createClient } from '@supabase/supabase-js';

const STUDENTS_DATA = [
  { id: 'st-00', rollNumber: '2025CSE019', name: 'Rahul Sharma' },
  { id: 'st-01', rollNumber: '2025CSE020', name: 'Priya Narayanan' },
];

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'for', 'of', 'and', 'to', 'in', 'a', 'an', 'show', 'tell',
  'check', 'get', 'give', 'me', 'details', 'status', 'record', 'records', 'report',
  'attendance', 'fee', 'fees', 'pending', 'due', 'paid', 'total', 'my', 'student',
  'pdf', 'excel', 'xlsx', 'docx', 'doc', 'download', 'export', 'current', 'sem',
  'semester', 'year', '2024', '2025', '2026', '2027', '2025-26', '2024-25', 'odd', 'even', 'how', 'much'
]);

function extractCandidates(query) {
  const clean = query
    .replace(/['’]s\b/gi, '')
    .replace(/[^\w\s-]/gi, ' ')
    .trim();

  const words = clean.split(/\s+/).filter(w => w.length >= 2);
  const candidates = [];

  for (const w of words) {
    const lower = w.toLowerCase();
    if (/^\d{2,4}$/.test(w)) continue;
    if (!STOP_WORDS.has(lower)) {
      candidates.push(w);
    }
  }

  for (const w of words) {
    if ((/\d/.test(w) && /[a-zA-Z]/.test(w)) || w.toUpperCase().startsWith('ST-')) {
      candidates.unshift(w);
    }
  }

  return candidates;
}

const cands = extractCandidates("What is Rahul's attendance for 2025-26?");
console.log('Candidates:', cands);

const all = STUDENTS_DATA;
let match = null;
for (const cand of cands) {
  const cLower = cand.toLowerCase();
  match = all.find(s => 
    s.rollNumber.toLowerCase().includes(cLower) ||
    s.name.toLowerCase().includes(cLower) ||
    s.name.split(' ')[0].toLowerCase() === cLower
  );
  if (match) break;
}
console.log('Matched:', match);
