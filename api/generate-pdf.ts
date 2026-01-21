
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
    
    // Set viewport to roughly Letter ratio to help with rendering logic before print
    await page.setViewport({ width: 816, height: 1056 }); 

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Changes: 
    // 1. Removed explicit margin numbers to let CSS @page handle it fully.
    // 2. Added scale: 0.98 to ensure tight fits don't overflow unexpectedly due to rendering engine differences.
    // 3. preferCSSPageSize: true is critical for honoring the @page rules in the CSS.
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.98, // Slight scaling to prevent edge cutoffs
      margin: { top: '0', bottom: '0', left: '0', right: '0' }, 
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
