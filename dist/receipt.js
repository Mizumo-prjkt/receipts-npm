// Receipt Image
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import QRCode from 'qrcode';

/**
 * Calculates totals for items and the subtotal.
 * @param {Array<object>} items - Array of item objects.
 * @returns {{lineItems: Array<object>, subtotal: number}} - An object containing line items with totals and the subtotal.
 */
function calculateLineItems(items) {
    const lineItems = items.map(item => {
        const total = item.quantity * item.price;
        return { ...item, total };
    });
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    return { lineItems, subtotal };
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
 * @param {object} [receiptData.discount] - Discount to apply. { type: 'fixed' | 'percentage', value: number }
 * @returns {string} The formatted receipt as a string.
 */
export function generateReceipt(receiptData) {
    const { storeName = "YOUR STORE NAME", companyAddress, items, taxRate = 0, vatRate = 0, discount } = receiptData;
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
        const qty = item.quantity.toString().padEnd(3);
        const name = item.name.padEnd(20);
        const itemTotal = `$${item.total.toFixed(2)}`.padStart(7);
        receipt += `${qty} ${name} ${itemTotal}\n`;
    }

    receipt += "\n--------------------------------\n";
    receipt += `Subtotal: ${`$${subtotal.toFixed(2)}`.padStart(22)}\n`;
    if (discountAmount > 0) {
        const discountLabel = discount.type === 'percentage' ? `Discount (${discount.value}%)` : 'Discount';
        receipt += `${discountLabel}: ${`-$${discountAmount.toFixed(2)}`.padStart(29 - discountLabel.length)}\n`;
    }
    if (vat > 0) {
        receipt += `VAT (${(vatRate * 100).toFixed(2)}%): ${`$${vat.toFixed(2)}`.padStart(20)}\n`;
    }
    if (tax > 0) {
        receipt += `Tax (${(taxRate * 100).toFixed(2)}%): ${`$${tax.toFixed(2)}`.padStart(20)}\n`;
    }
    receipt += "--------------------------------\n";
    receipt += `TOTAL: ${`$${total.toFixed(2)}`.padStart(25)}\n\n`;
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
    const receiptText = generateReceipt(receiptData);
    const lines = receiptText.split('\n');
    const { qrCode } = receiptData;

    // --- 1. Define canvas dimensions ---
    const canvasWidth = 400;
    const lineHeight = 20;
    const topPadding = 20;
    const bottomPadding = 20;
    let qrCodeHeight = 0;
    let qrCodeSize = 0;

    if (qrCode && qrCode.data) {
        qrCodeSize = qrCode.size || 100; // Default size 100px
        qrCodeHeight = qrCodeSize + 20; // size + padding
    }

    const canvasHeight = (lines.length * lineHeight) + topPadding + bottomPadding + qrCodeHeight;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // --- 2. Fill background and set text style ---
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = 'black';
    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.textBaseline = 'top';

    // --- 3. Draw receipt text ---
    let y = topPadding;
    for (const line of lines) {
        ctx.fillText(line, 15, y); // 15px left padding
        y += lineHeight;
    }

    // --- 4. Draw QR Code ---
    if (qrCode && qrCode.data) {
        const qrCodeImage = await QRCode.toDataURL(qrCode.data, { width: qrCodeSize, margin: 1 });
        const qrImg = await loadImage(qrCodeImage);
        const qrX = (canvasWidth - qrCodeSize) / 2; // Center the QR code
        ctx.drawImage(qrImg, qrX, y + 10);
    }

    // --- 5. Save the canvas to a file ---
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile(outputPath, buffer);
}

 