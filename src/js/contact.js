// contact.js — vCard download. Photo fetched from asset (was inline base64).
export function init(btnSelector = '#saveContactBtn') {
  const btn = document.querySelector(btnSelector);
  if (btn) btn.addEventListener('click', saveContact);
}
async function saveContact(e) {
  e.preventDefault();
  const res = await fetch('assets/q-contact-photo.jpg');
  const blob = await res.blob();
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  const photo = String(dataUrl).split(',')[1];
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
    `PHOTO;TYPE=JPEG;ENCODING=b:${photo}`,
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
