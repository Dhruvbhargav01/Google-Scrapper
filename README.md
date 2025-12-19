Google-Scrapper

Google-Scrapper is a Node.js tool built with Playwright to automate Google searches, navigate to the first search result, scroll the page, and extract information about top products/items. It automatically handles captchas, mimics human typing and scrolling, and saves the extracted data in JSON format.

Features

Automatic captcha detection and handling

Human-like typing in Google search bar

Scrolls pages slowly to simulate real user behavior

Extracts top 5 products/items including title, price, and link

Stores collected data in output.json

Supports dynamic and modern web pages

Installation

Clone the repository:

git clone <repository_url>


Navigate to the project folder:

cd Google-Scrapper


Install dependencies:

npm install playwright


Install required browsers for Playwright:

npx playwright install

Usage

Run the script using Node.js:

node index.js


Enter the search query when prompted.

The script automatically handles captcha if detected.

Wait for the script to scroll and collect the top 5 products/items.

The results are saved in output.json.

Output

The JSON output includes:

{
  "searchText": "example search",
  "sourcePage": "https://example.com",
  "totalItems": 5,
  "items": [
    {
      "title": "Product Title",
      "price": "₹1,00,000",
      "link": "https://example.com/product"
    }
  ]
}

Requirements

Node.js >= 16

Internet connection

Playwright and its browsers installed

Notes

Only top 5 products/items are extracted per search.

The script is designed to behave like a human to avoid detection.

Extracted data includes product title, price, and direct link.
