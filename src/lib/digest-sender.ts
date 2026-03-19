import { Paper, Recommendation } from '@prisma/client';

type RecommendationWithPaper = Recommendation & {
  paper: Paper;
};

export interface DigestEmailData {
  to: string;
  userName: string;
  date: Date;
  recommendations: RecommendationWithPaper[];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  }).format(date);
}

function buildEmailHtml(data: DigestEmailData): string {
  const dateStr = formatDate(data.date);

  const papersHtml = data.recommendations
    .map((rec, idx) => {
      const paper = rec.paper;
      const authors =
        paper.authors.slice(0, 3).join(', ') +
        (paper.authors.length > 3 ? ' et al.' : '');
      const doi = paper.doi
        ? `<a href="https://doi.org/${paper.doi}" style="color:#2563eb">DOI: ${paper.doi}</a>`
        : '';
      const pdf = paper.pdfUrl
        ? `<a href="${paper.pdfUrl}" style="color:#2563eb">PDF</a>`
        : '';

      return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;background:#fff;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">#${idx + 1} • ${paper.journal || '出版元不明'} ${paper.year || ''}</div>
        <h3 style="font-size:16px;font-weight:600;margin:0 0 8px;color:#111827;">${paper.title}</h3>
        <div style="font-size:13px;color:#6b7280;margin-bottom:8px;">${authors}</div>
        ${rec.reasonTemplate ? `<div style="font-size:12px;background:#eff6ff;border-left:3px solid #3b82f6;padding:6px 10px;margin-bottom:8px;border-radius:0 4px 4px 0;color:#1d4ed8;">📌 ${rec.reasonTemplate}</div>` : ''}
        ${paper.shortSummaryJa ? `<div style="font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">${paper.shortSummaryJa}</div>` : ''}
        ${paper.summaryJa ? `<div style="font-size:13px;color:#4b5563;margin-bottom:8px;line-height:1.6;">${paper.summaryJa}</div>` : ''}
        <div style="font-size:12px;color:#9ca3af;">${[doi, pdf].filter(Boolean).join(' • ')}</div>
      </div>
    `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>材料科学論文ダイジェスト</title></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:22px;">📚 材料科学論文ダイジェスト</h1>
          <div style="font-size:14px;opacity:0.9;margin-top:4px;">${dateStr}</div>
        </div>
        <div style="background:#fff;padding:20px 24px;border-bottom:1px solid #e5e7eb;">
          <p style="margin:0;color:#374151;">本日の推薦論文 ${data.recommendations.length}本をお届けします。</p>
        </div>
        <div style="padding:16px 0;">${papersHtml}</div>
        <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px;">
          材料科学論文ダイジェスト • <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color:#6b7280;">アプリを開く</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendDigestEmail(
  data: DigestEmailData
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[DigestSender] RESEND_API_KEY not set, skipping email');
    return false;
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const html = buildEmailHtml(data);
    const dateStr = formatDate(data.date);

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'digest@resend.dev',
      to: data.to,
      subject: `📚 材料科学論文ダイジェスト - ${dateStr}`,
      html,
    });

    if (error) {
      console.error('[DigestSender] Resend error:', error);
      return false;
    }

    console.log(`[DigestSender] Email sent to ${data.to}`);
    return true;
  } catch (error) {
    console.error('[DigestSender] Error:', error);
    return false;
  }
}
