// index.js
import { generateReceipt, generateReceiptImage } from '../dist/receipt.js';

// Sample data for the receipt
const receiptData = {
    storeName: "Awesome Store",
    items: [
        { name: "Milk", quantity: 2, price: 3.50 },
        { name: "Bread", quantity: 1, price: 2.75 },
        { name: "Eggs", quantity: 1, price: 4.99 },
    ],
    discount: { type: 'percentage', value: 10 },
    taxRate: 0.0825, // 8.25%
    qrCode: {
        data: "1173-3978-4877",
        size: 100
    }
};

// --- Generate the text receipt (existing functionality) ---
const textReceipt = generateReceipt(receiptData);
console.log("--- Text Receipt ---");
console.log(textReceipt);


// --- Generate the image receipt (new functionality) ---
async function createImageReceipt() {
    try {
        const outputPath = 'receipt.png';
        await generateReceiptImage(receiptData, outputPath);
        console.log(`\n--- Image Receipt ---`);
        console.log(`Receipt image successfully generated at: ${outputPath}`);
    } catch (error) {
        console.error("Failed to generate image receipt:", error);
    }
}

createImageReceipt();
