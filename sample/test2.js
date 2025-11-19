
import { generateReceipt, generateReceiptImage } from '../dist/receipt.js';


const exampleReceiptData = {
    storeName: "The Corner Coffee Shop",
    companyAddress: "123 Main St, Anytown",
    items: [
        { name: "Large Latte", quantity: 2, price: 4.50 },
        { name: "Blueberry Muffin - Freshly Baked", quantity: 1, price: 3.00 },
        { name: "Loyalty Discount Item", quantity: 1, price: 0.00 }, // Free item
    ],
    taxRate: 0.05, // 5% tax
    discount: { type: 'percentage', value: 10 }, // 10% off
    qrCode: {
        data: "https://example.com/receipt/12345",
        size: 150
    },
    currency: '€',
    // logoPath: './assets/logo.png', // Uncomment for logo testing
};

// --- Generate the text receipt (existing functionality) ---
const textReceipt = generateReceipt(exampleReceiptData);
console.log("--- Text Receipt ---");
console.log(textReceipt);


// --- Generate the image receipt (new functionality) ---
async function createImageReceipt() {
    try {
        const outputPath = 'receipt.png';
        await generateReceiptImage(exampleReceiptData, outputPath);
        console.log(`\n--- Image Receipt ---`);
        console.log(`Receipt image successfully generated at: ${outputPath}`);
    } catch (error) {
        console.error("Failed to generate image receipt:", error);
    }
}

createImageReceipt();
