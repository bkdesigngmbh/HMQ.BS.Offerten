import CloudConvert from 'cloudconvert';

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY || '');

export async function convertDocxToPdf(docxBuffer: Buffer, filename: string): Promise<Buffer> {
  // Job mit Upload, Konvertierung und Export erstellen
  const job = await cloudConvert.jobs.create({
    tasks: {
      'upload-docx': {
        operation: 'import/upload',
      },
      'convert-to-pdf': {
        operation: 'convert',
        input: 'upload-docx',
        output_format: 'pdf',
        engine: 'office',
      },
      'export-pdf': {
        operation: 'export/url',
        input: 'convert-to-pdf',
      },
    },
  });

  // Upload-Task finden
  const uploadTask = job.tasks.find((t) => t.name === 'upload-docx');
  if (!uploadTask) {
    throw new Error('Upload-Task nicht gefunden');
  }

  // DOCX hochladen
  await cloudConvert.tasks.upload(uploadTask, docxBuffer, filename);

  // Warten bis Job fertig
  const finishedJob = await cloudConvert.jobs.wait(job.id);

  // Export-Task mit PDF-URL finden
  const exportTask = finishedJob.tasks.find((t) => t.name === 'export-pdf');
  if (!exportTask?.result?.files?.[0]?.url) {
    throw new Error('PDF-Export fehlgeschlagen');
  }

  // PDF herunterladen
  const pdfUrl = exportTask.result.files[0].url;
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error('PDF-Download fehlgeschlagen');
  }

  return Buffer.from(await response.arrayBuffer());
}

export function isCloudConvertConfigured(): boolean {
  return !!process.env.CLOUDCONVERT_API_KEY;
}
