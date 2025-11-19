# receipt-generator-js Documentation

A simple and flexible library to generate image-based receipts in both Node.js and browser environments. It supports a wide range of customization options to create professional-looking receipts.

## Features

-   Generate receipts as PNG images.
-   Works in Node.js (saves to file) and the Browser (embed or download).
-   Customizable with store name, company address, and logo (Node.js only for local file paths).
-   Supports items with automatic line-breaking for long names.
-   Calculates subtotals, discounts (fixed or percentage), taxes, and VAT.
-   Optionally add a QR code to the bottom of the receipt.
-   Customizable currency symbol.
-   Optionally save receipt data to browser's local storage for debugging or persistence.

## Installation

```bash
npm install receipt-generator-js
```

## Basic Usage

### Node.js Usage

This example saves a receipt image to `receipt.png`.

```javascript
import { generateReceiptImage } from 'receipt-generator-js';

const receiptData = {
    storeName: "My Awesome Store",
    items: [
        { name: "Sample Item 1", quantity: 2, price: 5.00 },
        { name: "Sample Item 2 with a very long name that needs to wrap", quantity: 1, price: 10.00 },
    ],
    companyAddress: "123 Main Street, Anytown, USA",
    logoPath: './assets/logo.png', // Make sure this path is correct for your Node.js project
    currency: '€',
    discount: { type: 'percentage', value: 5 }, // 5% off
    taxRate: 0.08, // 8%
};

async function createReceipt() {
    try {
        await generateReceiptImage(receiptData, 'receipt.png');
        console.log('Receipt generated successfully!');
    } catch (error) {
        console.error('Error generating receipt:', error);
    }
}

createReceipt();
```

### Browser Usage

This example generates a receipt and embeds it into an `<img>` tag.

```html
<!-- Add an image tag to your HTML -->
<img id="receipt-image" src="" alt="Receipt will appear here">

<script type="module">
    // Make sure to use an import map for dependencies like 'qrcode' in your HTML head
    // Example: <script type="importmap">{ "imports": { "qrcode": "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm" }}</script>

    // Use cache-busting for development to ensure the latest script is loaded
    const scriptVersion = new Date().getTime();
    const { generateReceiptImage } = await import(`./dist/receipt.js?v=${scriptVersion}`);

    const receiptData = {
        storeName: "My Browser Store",
        companyAddress: "456 Web Lane, Internet City",
        items: [{ name: "Web Item with a detailed description", quantity: 1, price: 25.00 }],
        currency: '£',
        taxRate: 0.05, // 5%
        qrCode: { data: 'https://example.com/browser-receipt', size: 80 },
        outputType: 'dataURL', // Required to get the image data back for embedding
        saveToBrowserStorage: true // Save this receipt data to local storage
    };

    async function embedReceipt() {
        const imageDataUrl = await generateReceiptImage(receiptData);
        document.getElementById('receipt-image').src = imageDataUrl;
    }

    embedReceipt();
</script>
```

## API Reference

The `generateReceiptImage` function takes a `receiptData` object with the following properties:

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `storeName` | `string` | No | `"YOUR STORE NAME"` | The name of your store. |
| `companyAddress`| `string` | No | `undefined` | The physical or mailing address of the company. |
| `logoPath` | `string` | No | `undefined` | **Node.js only.** A local file path to a logo image (e.g., `./assets/logo.png`). |
| `currency` | `string` | No | `"$"` | The currency symbol to use (e.g., `€`, `£`, `¥`). |
| `items` | `Array<object>` | Yes | `[]` | An array of item objects. Each object must have `name` (string), `quantity` (number), and `price` (number). Invalid quantities or prices will default to `0`. |
| `taxRate` | `number` | No | `0` | The sales tax rate as a decimal (e.g., `0.08` for 8%). |
| `vatRate` | `number` | No | `0` | The Value Added Tax rate as a decimal (e.g., `0.20` for 20%). |
| `discount` | `object` | No | `undefined` | An object specifying a discount. Use `{ type: 'fixed', value: 10.00 }` for a fixed amount or `{ type: 'percentage', value: 15 }` for a percentage. |
| `qrCode` | `object` | No | `undefined` | An object to configure a QR code. Must contain `data` (string, the content for the QR code). `size` (number, width/height in pixels) is optional and defaults to `120`. Example: `{ data: 'Your URL or ID', size: 120 }`. |
| `outputType` | `string` | No | `undefined` | **Browser only.** Set to `'dataURL'` to have the function return a Base64 string for embedding, instead of triggering a file download. |
| `saveToBrowserStorage` | `boolean` | No | `false` | **Browser only.** If `true`, saves the entire `receiptData` object to the browser's local storage under the key `lastReceiptData`. Useful for testing/debugging. |

---

## Scenarios & Examples

### 1. Simple Receipt with Custom Currency and Company Address

```javascript
const receiptData = {
    currency: '€',
    storeName: "Le Café",
    companyAddress: "10 Rue de la Paix, Paris",
    items: [
        { name: "Croissant", quantity: 2, price: 2.50 },
        { name: "Espresso", quantity: 1, price: 3.00 },
    ]
};

await generateReceiptImage(receiptData, 'cafe-receipt.png');
```

### 2. Receipt with a Fixed Discount and Tax

```javascript
const receiptData = {
    storeName: "Hardware & Co.",
    items: [
        { name: "Hammer", quantity: 1, price: 15.00 },
        { name: "Nails (Box)", quantity: 2, price: 4.50 },
    ],
    discount: { type: 'fixed', value: 5.00 }, // $5 off coupon
    taxRate: 0.07 // 7% tax
};

await generateReceiptImage(receiptData, 'hardware-receipt.png');
```

### 3. Full-Featured Receipt with Percentage Discount, VAT, and QR Code

```javascript
const receiptData = {
    storeName: "Global Electronics",
    companyAddress: "123 Tech Road, Silicon Valley",
    items: [
        { name: "Wireless Mouse with an Extra Long Name", quantity: 1, price: 75.99 },
        { name: "Mechanical Keyboard (RGB Backlit, Cherry MX Red)", quantity: 1, price: 180.00 },
    ],
    discount: { type: 'percentage', value: 10 }, // 10% off for a sale
    vatRate: 0.20, // 20% VAT
    qrCode: {
        data: 'https://example.com/order/XYZ-123',
        size: 100 // Optional size in pixels
    }
};

await generateReceiptImage(receiptData, 'electronics-receipt.png');
```

### 4. Browser: Embed Image and Provide Download Link

This builds on the basic browser example.

```html
<div id="receipt-output" style="display: none;">
    <h2>Your Receipt</h2>
    <img id="receipt-image" src="">
    <a id="download-btn" download="receipt.png">Download</a>
</div>

<script type="module">
    import { generateReceiptImage } from './dist/receipt.js';

    const receiptData = {
        storeName: "Online Store",
        items: [{ name: "Digital Product", quantity: 1, price: 99.00 }],
        outputType: 'dataURL'
    };

    async function handleReceipt() {
        const imageDataUrl = await generateReceiptImage(receiptData);

        document.getElementById('receipt-image').src = imageDataUrl;
        document.getElementById('download-btn').href = imageDataUrl;
        document.getElementById('receipt-output').style.display = 'block';
    }

    handleReceipt();
</script>
```