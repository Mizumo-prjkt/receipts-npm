// Receipt Image
let createCanvas, loadImage, fs, QRCode;
const isNode = typeof window === 'undefined';
const DEFAULT_FONT = '16px "Courier New", Courier, monospace';

if (isNode) {
    // Use dynamic import for Node.js modules
    createCanvas = (await import('canvas')).createCanvas;
    loadImage = (await import('canvas')).loadImage;
    fs = (await import('fs')).default;
    QRCode = (await import('qrcode')).default;
} else {
    // In the browser, these will be handled differently
    // We will dynamically load QRCode to keep it modular
    QRCode = (await import('qrcode')).default; // Ensure qrcode is loaded in browser
}

/**
 * Calculates totals for items and the subtotal.
 * @param {Array<object>} items - Array of item objects.
 * @returns {{lineItems: Array<object>, subtotal: number}} - An object containing line items with totals and the subtotal.
 */
function calculateLineItems(items) {
    const lineItems = items.map(item => {
        // Ensure price and quantity are numbers
        const quantity = parseFloat(item.quantity);
        const price = parseFloat(item.price);

        if (isNaN(quantity) || isNaN(price) || quantity < 0 || price < 0) {
            console.warn(`Invalid quantity or price for item: ${item.name}. Defaulting to 0.`);
            return { ...item, quantity: 0, price: 0, total: 0 };
        }

        const total = item.quantity * item.price;
        return { ...item, total };
    });
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    return { lineItems, subtotal };
}

// Helper to wrap text for the text receipt
function wrapText(text, maxLength) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    for (const word of words) {
        if ((currentLine + word).length > maxLength && currentLine.length > 0) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    }
    lines.push(currentLine.trim());
    return lines;
}

/**
 * Generates a formatted text receipt (for structure and fallback).
 *
 * @param {object} receiptData - The data for the receipt.
 * @param {string} [receiptData.storeName="YOUR STORE NAME"] - The name of the store.
 * @param {string} [receiptData.companyAddress] - The company's address.
 * @param {Array<object>} receiptData.items - The items purchased.
 * @param {number} [receiptData.taxRate=0] - The tax rate as a decimal (e.g., 0.08 for 8%).
 * @param {number} [receiptData.vatRate=0] - The VAT rate as a decimal.
 * @param {number} [receiptData.vatRate=0] - The VAT rate as a decimal.
 * @param {object} [receiptData.discount] - Discount to apply. { type: 'fixed' | 'percentage', value: number }
 * @returns {string} The formatted receipt as a string.
 */
export function generateReceipt(receiptData) {
    const { storeName = "YOUR STORE NAME", companyAddress, items, taxRate = 0, vatRate = 0, discount, currency = '$' } = receiptData;
    const { lineItems, subtotal } = calculateLineItems(items);

    let discountAmount = 0;
    if (discount) {
        if (discount.type === 'percentage') {
            discountAmount = subtotal * (discount.value / 100);
        } else {
            discountAmount = discount.value;
        }
    }

    const subtotalAfterDiscount = subtotal - discountAmount;
    const tax = subtotalAfterDiscount * taxRate;
    const vat = subtotalAfterDiscount * vatRate;
    const total = subtotalAfterDiscount + tax + vat;

    let receipt = "================================\n";
    receipt += `${storeName.padStart(15 + storeName.length / 2)}\n`;
    if (companyAddress) {
        receipt += `${companyAddress.padStart(15 + companyAddress.length / 2)}\n`;
    }
    receipt += "================================\n\n";
    receipt += "QTY  ITEM                  TOTAL\n";
    receipt += "--------------------------------\n";

    for (const item of lineItems) {
        const qty = item.quantity.toString();
        const itemTotal = `${currency}${item.total.toFixed(2)}`;
        const maxNameLength = 32 - qty.length - itemTotal.length - 2; // QTY NAME TOTAL

        const nameLines = wrapText(item.name, maxNameLength);

        receipt += `${qty.padEnd(3)} ${nameLines[0].padEnd(maxNameLength)} ${itemTotal.padStart(7)}\n`;
        for (let i = 1; i < nameLines.length; i++) {
            receipt += `    ${nameLines[i].padEnd(maxNameLength + 3)}\n`; // Indent wrapped lines
        }
    }

    receipt += "\n--------------------------------\n";
    receipt += `Subtotal: ${`${currency}${subtotal.toFixed(2)}`.padStart(22)}\n`;
    if (discountAmount > 0) {
        const discountLabel = discount.type === 'percentage' ? `Discount (${discount.value}%)` : 'Discount';
        receipt += `${discountLabel}: ${`-${currency}${discountAmount.toFixed(2)}`.padStart(29 - discountLabel.length)}\n`;
    }
    if (vat > 0) {
        receipt += `VAT (${(vatRate * 100).toFixed(2)}%): ${`${currency}${vat.toFixed(2)}`.padStart(20)}\n`;
    }
    if (tax > 0) {
        receipt += `Tax (${(taxRate * 100).toFixed(2)}%): ${`${currency}${tax.toFixed(2)}`.padStart(20)}\n`;
    }
    receipt += "--------------------------------\n";
    receipt += `TOTAL: ${`${currency}${total.toFixed(2)}`.padStart(25)}\n\n`;
    receipt += "================================\n";
    receipt += "   Thank you for your purchase!   \n";
    receipt += "================================\n";

    return receipt;
}
/**
 * Generates a receipt as an image and saves it to a file.
 *
 * @param {object} receiptData - The data for the receipt (same as generateReceipt).
 * @param {string} [outputPath='receipt.png'] - The path to save the image file.
 * @returns {Promise<void>} A promise that resolves when the file is written.
 */
export async function generateReceiptImage(receiptData, outputPath = 'receipt.png') {    
    const { 
        storeName = "YOUR STORE NAME", 
        companyAddress, 
        items, 
        taxRate = 0, 
        vatRate = 0, 
        discount, 
        logoPath, 
        qrCode,
        currency = '$'
    } = receiptData;

    // Browser: Save to local storage if flag is set
    if (!isNode && receiptData.saveToBrowserStorage) {
        try {
            localStorage.setItem('lastReceiptData', JSON.stringify(receiptData));
            console.log('Receipt data saved to browser local storage.');
        } catch (e) {
            console.error('Could not save to local storage:', e); //
        }
    }

    // --- 1. Calculations ---
    const { lineItems, subtotal } = calculateLineItems(items);
    let discountAmount = 0;
    if (discount) {
        discountAmount = discount.type === 'percentage' ? subtotal * (discount.value / 100) : discount.value;
    }
    const subtotalAfterDiscount = subtotal - discountAmount;
    const tax = subtotalAfterDiscount * taxRate;
    const vat = subtotalAfterDiscount * vatRate;
    const total = subtotalAfterDiscount + tax + vat;

    // --- 2. Canvas Setup ---
    const canvasWidth = 450; // Increased width for better layout
    const padding = 20;
    const contentWidth = canvasWidth - (padding * 2);
    let currentY = padding;
    const textLineHeight = 20; // Standard line height for text

    let qrCodeHeight = 0;
    let qrCodeSize = 0;
    if (qrCode && qrCode.data) {
        qrCodeSize = qrCode.size || 120; // Default QR size
        qrCodeHeight = qrCodeSize + 20; // QR code plus some padding
    }

    // Estimate initial height, will be adjusted later
    const estimatedHeight = 500 + (lineItems.length * textLineHeight * 2) + qrCodeHeight;
    const canvas = isNode ? createCanvas(canvasWidth, estimatedHeight) : document.createElement('canvas');
    if (!isNode) {
        canvas.width = canvasWidth;
        canvas.height = estimatedHeight; // Set initial height for browser canvas
    }
    const ctx = canvas.getContext('2d');

    // --- 3. Draw Content ---

    // Background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvas.height);
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top'; //

    // Logo
    if (logoPath) {
        try {
            const logo = await (isNode ? loadImage(logoPath) : new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = logoPath;
            }));
            const logoHeight = 80;
            const logoWidth = (logo.width / logo.height) * logoHeight;
            ctx.drawImage(logo, (canvasWidth - logoWidth) / 2, currentY, logoWidth, logoHeight);
            currentY += logoHeight + 10;
        } catch (err) {
            console.warn(`Could not load logo image at path: ${logoPath}. Error: ${err.message}`); //
        }
    }

    // Store Name & Address
    ctx.font = 'bold 24px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(storeName, canvasWidth / 2, currentY);
    currentY += 30;
    if (companyAddress) {
        ctx.font = DEFAULT_FONT;
        ctx.fillText(companyAddress, canvasWidth / 2, currentY);
        currentY += 20;
    }
    currentY += 10; // Extra padding

    // Items Header
    ctx.textAlign = 'left';
    ctx.font = DEFAULT_FONT;
    const drawLine = () => {
        const lineY = currentY + (textLineHeight / 2); // Center the line vertically
        ctx.beginPath();
        ctx.moveTo(padding, lineY);
        ctx.lineTo(canvasWidth - padding, lineY);
        ctx.strokeStyle = 'black'; // Set line color
        ctx.stroke();
        currentY += textLineHeight; // Advance the Y position
    };
    drawLine();
    ctx.fillText("QTY  ITEM", padding, currentY);
    ctx.textAlign = 'right';
    ctx.fillText("TOTAL", canvasWidth - padding, currentY);
    currentY += textLineHeight;
    drawLine();

    // Items
    for (const item of lineItems) {
        const priceText = `${currency}${item.total.toFixed(2)}`;
        const qtyText = `${item.quantity}x`;
        const maxNameWidth = contentWidth - ctx.measureText(priceText).width - ctx.measureText(qtyText).width - 15;

        // Auto-breaking for long item names
        let nameLines = [];
        let currentLine = '';
        const words = item.name.split(' ');
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(testLine).width > maxNameWidth && currentLine.length > 0) {
                nameLines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine = testLine + ' ';
            }
        }
        nameLines.push(currentLine.trim());

        ctx.textAlign = 'left';
        ctx.fillText(`${qtyText} ${nameLines[0]}`, padding, currentY);
        ctx.textAlign = 'right';
        ctx.fillText(priceText, canvasWidth - padding, currentY);
        currentY += textLineHeight;

        // Print subsequent lines for wrapped item names
        for (let i = 1; i < nameLines.length; i++) {
            ctx.textAlign = 'left';
            ctx.fillText(`   ${nameLines[i]}`, padding, currentY);
            currentY += textLineHeight;
        }
    }
    drawLine();

    // Sub-price body
    const drawSubTotalLine = (label, value) => {
        ctx.textAlign = 'left';
        ctx.fillText(label, padding, currentY);
        ctx.textAlign = 'right';
        ctx.fillText(value, canvasWidth - padding, currentY);
        currentY += textLineHeight;
    };
    drawSubTotalLine('Subtotal', `${currency}${subtotal.toFixed(2)}`);
    if (discountAmount > 0) {
        const label = discount.type === 'percentage' ? `Discount (${discount.value}%)` : 'Discount';
        drawSubTotalLine(label, `-${currency}${discountAmount.toFixed(2)}`);
    }
    if (vat > 0) drawSubTotalLine(`VAT (${(vatRate * 100).toFixed(2)}%)`, `${currency}${vat.toFixed(2)}`);
    if (tax > 0) drawSubTotalLine(`Tax (${(taxRate * 100).toFixed(2)}%)`, `${currency}${tax.toFixed(2)}`);
    drawLine();
    ctx.font = 'bold 20px "Courier New", Courier, monospace';
    drawSubTotalLine('TOTAL', `${currency}${total.toFixed(2)}`);
    currentY += 10;

    // Thank you message
    ctx.textAlign = 'center';
    ctx.font = DEFAULT_FONT;
    currentY += textLineHeight;
    ctx.fillText("Thank you for your purchase!", canvasWidth / 2, currentY);
    currentY += textLineHeight + 10;

    // QR Code
    if (qrCode && qrCode.data) {
        const qrCodeImage = await QRCode.toDataURL(qrCode.data, { width: qrCodeSize, margin: 2 });
        const qrImg = await (isNode ? loadImage(qrCodeImage) : new Promise((resolve, reject) => { //
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = qrCodeImage;
        }));
        const qrX = (canvasWidth - qrCodeSize) / 2;
        ctx.drawImage(qrImg, qrX, currentY);
        currentY += qrCodeSize + 10;
    }

    // --- 4. Finalize and Save / Return ---
    // Adjust canvas height to fit content precisely
    const finalCanvas = isNode ? createCanvas(canvasWidth, currentY + padding) : document.createElement('canvas');
    if (!isNode) {
        finalCanvas.width = canvasWidth;
        finalCanvas.height = currentY + padding;
    }
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.fillStyle = 'white';
    finalCtx.fillRect(0, 0, canvasWidth, finalCanvas.height);
    finalCtx.drawImage(canvas, 0, 0); // Draw the content from the temporary canvas

    if (isNode) {
        const buffer = finalCanvas.toBuffer('image/png');
        await fs.promises.writeFile(outputPath, buffer);
    } else {
        const dataURL = finalCanvas.toDataURL('image/png');

        // If outputType is 'dataURL', return it for embedding. Otherwise, download it.
        if (receiptData.outputType === 'dataURL') {
            return dataURL;
        } else {
            // Default browser behavior: trigger a download
            const link = document.createElement('a');
            link.download = outputPath;
            link.href = dataURL;
            link.click();
        }
    }
}

 