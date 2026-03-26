import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Wczytaj PDF z URL lub ArrayBuffer
 */
export const loadPdf = async (source) => {
  let pdfBytes;
  
  if (typeof source === 'string') {
    // URL
    const response = await fetch(source);
    pdfBytes = await response.arrayBuffer();
  } else {
    // ArrayBuffer
    pdfBytes = source;
  }
  
  return await PDFDocument.load(pdfBytes);
};

/**
 * Wypełnij pola tekstowe w PDF (AcroForm)
 */
export const fillPdfFormFields = async (pdfDoc, fields) => {
  try {
    const form = pdfDoc.getForm();
    
    Object.entries(fields).forEach(([fieldName, value]) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
      } catch (e) {
        console.warn(`Pole "${fieldName}" nie znalezione w formularzu`);
      }
    });
    
    // Opcjonalnie: spłaszcz formularz (pola stają się nieedytowalne)
    // form.flatten();
    
    return pdfDoc;
  } catch (e) {
    console.warn('PDF nie ma formularza AcroForm, używam tekstu');
    return pdfDoc;
  }
};

/**
 * Dodaj tekst do PDF (dla PDF bez formularzy)
 */
export const addTextToPdf = async (pdfDoc, textItems) => {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  
  textItems.forEach(item => {
    const page = pages[item.page || 0];
    if (!page) return;
    
    const { height } = page.getSize();
    
    page.drawText(item.text || '', {
      x: item.x,
      y: item.y, // PDF ma y od dołu, więc możesz potrzebować: height - item.y
      size: item.size || 12,
      font: item.bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  });
  
  return pdfDoc;
};

/**
 * Dodaj podpis (obrazek) do PDF
 */
export const addSignatureToPdf = async (pdfDoc, signatureData) => {
  const { imageUrl, imageBytes, page: pageIndex = 0, x, y, width = 150, height = 50 } = signatureData;
  
  let imageData;
  
  if (imageBytes) {
    imageData = imageBytes;
  } else if (imageUrl) {
    const response = await fetch(imageUrl);
    imageData = await response.arrayBuffer();
  } else {
    throw new Error('Brak danych podpisu');
  }
  
  // Wykryj typ obrazka
  const uint8Array = new Uint8Array(imageData);
  const isPng = uint8Array[0] === 0x89 && uint8Array[1] === 0x50;
  
  let image;
  if (isPng) {
    image = await pdfDoc.embedPng(imageData);
  } else {
    image = await pdfDoc.embedJpg(imageData);
  }
  
  const pages = pdfDoc.getPages();
  const page = pages[pageIndex];
  
  if (!page) {
    throw new Error(`Strona ${pageIndex} nie istnieje`);
  }
  
  page.drawImage(image, {
    x,
    y,
    width,
    height,
  });
  
  return pdfDoc;
};

/**
 * Dodaj wiele podpisów do PDF
 */
export const addMultipleSignatures = async (pdfDoc, signatures) => {
  for (const sig of signatures) {
    await addSignatureToPdf(pdfDoc, sig);
  }
  return pdfDoc;
};

/**
 * Dodaj datę i miejsce do PDF
 */
export const addDateAndPlace = async (pdfDoc, { date, place, position }) => {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const page = pages[position.page || 0];
  
  if (!page) return pdfDoc;
  
  const dateText = date || new Date().toLocaleDateString('pl-PL');
  const fullText = place ? `${place}, ${dateText}` : dateText;
  
  page.drawText(fullText, {
    x: position.x,
    y: position.y,
    size: position.size || 11,
    font,
    color: rgb(0, 0, 0),
  });
  
  return pdfDoc;
};

/**
 * Zapisz PDF jako Uint8Array
 */
export const savePdf = async (pdfDoc) => {
  return await pdfDoc.save();
};

/**
 * Zapisz PDF jako Blob
 */
export const savePdfAsBlob = async (pdfDoc) => {
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Pobierz PDF (trigger download)
 */
export const downloadPdf = async (pdfDoc, filename = 'dokument.pdf') => {
  const blob = await savePdfAsBlob(pdfDoc);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Kompletna funkcja: wypełnij dane klienta + dodaj podpisy
 */
export const generateClientContract = async ({
  templateUrl,
  clientData,
  signatures,
  datePosition,
  outputFilename
}) => {
  // 1. Wczytaj szablon
  let pdfDoc = await loadPdf(templateUrl);
  
  // 2. Spróbuj wypełnić formularz (jeśli jest)
  if (clientData.formFields) {
    pdfDoc = await fillPdfFormFields(pdfDoc, clientData.formFields);
  }
  
  // 3. Dodaj teksty (jeśli są)
  if (clientData.textItems && clientData.textItems.length > 0) {
    pdfDoc = await addTextToPdf(pdfDoc, clientData.textItems);
  }
  
  // 4. Dodaj datę i miejsce
  if (datePosition) {
    pdfDoc = await addDateAndPlace(pdfDoc, {
      date: clientData.date,
      place: clientData.place || 'Warszawa',
      position: datePosition
    });
  }
  
  // 5. Dodaj podpisy
  if (signatures && signatures.length > 0) {
    pdfDoc = await addMultipleSignatures(pdfDoc, signatures);
  }
  
  // 6. Pobierz lub zwróć
  if (outputFilename) {
    await downloadPdf(pdfDoc, outputFilename);
  }
  
  return pdfDoc;
};

/**
 * Konwertuj base64 na ArrayBuffer
 */
export const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64.split(',')[1] || base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Konwertuj File na ArrayBuffer
 */
export const fileToArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};