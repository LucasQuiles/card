// contact.js — vCard download. Photo fetched from asset (was inline base64).
// The asset is imported so Vite bundles + hashes it and resolves the base-prefixed
// URL at build time (a runtime string path would not survive the build / would 404).
import photoUrl from '../assets/q-contact-photo.jpg';

export function init(btnSelector = '#saveContactBtn') {
  const btn = document.querySelector(btnSelector);
  if (btn) btn.addEventListener('click', saveContact);
}

// Photo is a nice-to-have: if the fetch/encode fails for any reason, the
// download must still happen — degrade to a photo-less vCard, never no-op.
async function fetchPhotoLine() {
  try {
    const res = await fetch(photoUrl);
    if (!res.ok) throw new Error(`photo fetch failed: ${res.status}`);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const photo = String(dataUrl).split(',')[1];
    return photo ? [`PHOTO;TYPE=JPEG;ENCODING=b:${photo}`] : [];
  } catch (err) {
    console.warn('vCard photo unavailable, downloading without it', err);
    return [];
  }
}

async function saveContact() {
  const photoLine = await fetchPhotoLine();
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Quiles;Lucas;;;',
    'FN:Lucas Quiles',
    'ORG:Quiles Studio',
    'TITLE:Founder',
    'TEL;TYPE=CELL:+18459780919',
    'EMAIL;TYPE=INTERNET:Lucas@Quiles.studio',
    'URL:https://quiles.studio',
    'URL:https://github.com/LucasQuiles',
    ...photoLine,
    'NOTE:AI agents\\, automation\\, full-stack development\\, infrastructure & security',
    'END:VCARD',
  ].join('\n');
  const url = URL.createObjectURL(new Blob([vcard], { type: 'text/vcard' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Lucas-Quiles.vcf';
  a.click();
  URL.revokeObjectURL(url);
}
