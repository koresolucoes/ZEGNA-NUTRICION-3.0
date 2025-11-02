
import chromium from '@sparticuz/chromium';
// @ts-ignore
import puppeteer from 'puppeteer-core';

// Vercel-specific config to handle larger payloads and binary responses correctly.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow larger HTML content
    },
    responseLimit: false, // Disable response size limit for PDFs
  },
};


// As types seriam normally `import type { VercelRequest, VercelResponse } from '@vercel/node';`
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { html, filename = 'documento.pdf' } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required in the request body.' });
    }

    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: executablePath || process.env.CHROME_PATH, // CHROME_PATH is for local development
    });

    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200);
    res.end(pdfBuffer);

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: `An error occurred while generating the PDF: ${error.message}` });
    }
  }
}
