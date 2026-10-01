import * as FileSystem from 'expo-file-system';

// Ensure global window object exists for libraries checking window
if (typeof window === 'undefined') {
  global.window = global;
}

/**
 * Generates a real .pptx file using pptxgenjs.
 * @param {Array} slides List of slide objects [{ type: 'image'|'text'|'title', uri, title, subtitle, text }]
 * @param {Object} options Options like { layout: '16:9' | '4:3', titleSlide: { title, subtitle } }
 * @returns {Promise<{fileUri: string, filename: string}>}
 */
export const generatePptxFile = async (slides, options = {}) => {
  try {
    // Dynamic require for pptxgenjs
    let PptxGenJS;
    try {
      const pptxModule = require('pptxgenjs');
      PptxGenJS = pptxModule.default || pptxModule;
    } catch (e) {
      console.log('[PPT] pptxgenjs require error:', e);
      throw new Error("پێویستە پاکێجی pptxgenjs دابمەزرێنرێت (npx expo install pptxgenjs jszip).");
    }

    const pptx = new PptxGenJS();

    if (options.layout === '4:3') {
      pptx.layout = 'LAYOUT_4x3';
    } else {
      pptx.layout = 'LAYOUT_16x9';
    }

    const slideW = options.layout === '4:3' ? 10 : 10;
    const slideH = options.layout === '4:3' ? 7.5 : 5.625;

    // 1. Optional Title Slide at start
    if (options.titleSlide && (options.titleSlide.title || options.titleSlide.subtitle)) {
      const titleSlide = pptx.addSlide();
      if (options.titleSlide.title) {
        titleSlide.addText(options.titleSlide.title, {
          x: 0.5,
          y: '35%',
          w: '90%',
          h: 1.5,
          align: 'center',
          fontSize: 28,
          bold: true,
          color: '1A1A1A',
          rtl: true,
        });
      }
      if (options.titleSlide.subtitle) {
        titleSlide.addText(options.titleSlide.subtitle, {
          x: 0.5,
          y: '55%',
          w: '90%',
          h: 1.0,
          align: 'center',
          fontSize: 18,
          color: '555555',
          rtl: true,
        });
      }
    }

    // 2. Loop through user slides
    for (let i = 0; i < slides.length; i++) {
      const item = slides[i];
      const slide = pptx.addSlide();

      if (item.type === 'title') {
        if (item.title) {
          slide.addText(item.title, {
            x: 0.5,
            y: '35%',
            w: '90%',
            h: 1.5,
            align: 'center',
            fontSize: 28,
            bold: true,
            color: '1A1A1A',
            rtl: true,
          });
        }
        if (item.subtitle) {
          slide.addText(item.subtitle, {
            x: 0.5,
            y: '55%',
            w: '90%',
            h: 1.0,
            align: 'center',
            fontSize: 18,
            color: '555555',
            rtl: true,
          });
        }
      } else if (item.type === 'text') {
        if (item.title) {
          slide.addText(item.title, {
            x: 0.5,
            y: 0.4,
            w: '90%',
            h: 0.8,
            align: 'right',
            fontSize: 22,
            bold: true,
            color: '1A1A1A',
            rtl: true,
          });
        }
        if (item.text) {
          slide.addText(item.text, {
            x: 0.5,
            y: item.title ? 1.3 : 0.6,
            w: '90%',
            h: item.title ? slideH - 1.8 : slideH - 1.2,
            align: 'right',
            fontSize: 16,
            color: '333333',
            rtl: true,
            valign: 'top',
          });
        }
      } else if (item.type === 'image' && item.uri) {
        let base64Img = '';
        if (item.uri.startsWith('data:image')) {
          base64Img = item.uri;
        } else {
          const rawBase64 = await FileSystem.readAsStringAsync(item.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mime = item.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          base64Img = `data:${mime};base64,${rawBase64}`;
        }

        // Add image fitting inside slide without stretching or cropping
        slide.addImage({
          data: base64Img,
          x: 0.2,
          y: 0.2,
          w: slideW - 0.4,
          h: slideH - 0.4,
          sizing: {
            type: 'contain',
            w: slideW - 0.4,
            h: slideH - 0.4,
          },
        });
      }
    }

    // Write .pptx as base64 string
    const base64Output = await pptx.write({ outputType: 'base64' });

    const filename = `PPT_${Date.now()}.pptx`;
    const targetPath = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(targetPath, base64Output, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      fileUri: targetPath,
      filename: filename,
    };
  } catch (err) {
    console.log('[PPT] Error in generatePptxFile:', err);
    throw err;
  }
};
