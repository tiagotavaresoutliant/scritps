// ghl-data-updater.js
const fs = require('fs');
const path = require('path');

// Path to the files (adjust these to match your actual file paths)
const OLD_JSON_PATH = path.join(__dirname, 'old-data.json');
const SOURCE_JS_PATH = path.join(__dirname, 'ghl-connection.js'); // or the file containing your JS data
const OUTPUT_JSON_PATH = path.join(__dirname, 'updated-data.json');
const OUTPUT_XLSX_PATH = path.join(__dirname, 'updated-data.xlsx');

// Function to extract location data from the JS file
function extractDataFromJsFile(jsContent) {
  // Create a map to store GHL Location IDs and Location Tokens
  const locationMap = new Map();
  
  // Extract all location data using regex
  // This regex pattern looks for the microsite name, GHL Location ID, and Location Token
  const regex = /'Microsite Name':\s+'([^']+)'[^}]+'GHL Location ID':\s+'([^']+)'[^}]+'Location Token':\s+'([^']+)'/g;
  let match;
  
  while ((match = regex.exec(jsContent)) !== null) {
    const micrositeName = match[1];
    const ghlLocationId = match[2];
    const locationToken = match[3];
    
    locationMap.set(micrositeName, {
      ghlLocationId,
      locationToken
    });
  }
  
  return locationMap;
}

// Function to update JSON based on the JS data
function updateJsonData(jsonData, jsDataMap) {
  console.log(`Found ${jsDataMap.size} entries in JS file`);
  
  let updatedCount = 0;
  const updatedData = jsonData.map(item => {
    const micrositeName = item["Microsite Name"];
    const jsData = jsDataMap.get(micrositeName);
    
    // If we have matching data from the JS file
    if (jsData) {
      const idMatch = item["GHL Location ID"] === jsData.ghlLocationId;
      const tokenMatch = item["Location Token"] === jsData.locationToken;
      
      // Update the ID and Token if needed
      if (!idMatch) {
        console.log(`Updating ID for ${micrositeName}: ${item["GHL Location ID"]} -> ${jsData.ghlLocationId}`);
        item["GHL Location ID"] = jsData.ghlLocationId;
      }
      
      if (!tokenMatch) {
        console.log(`Updating Token for ${micrositeName}: ${item["Location Token"]} -> ${jsData.locationToken}`);
        item["Location Token"] = jsData.locationToken;
      }
      
      // Add the updated property based on what was changed
      if (!idMatch && !tokenMatch) {
        item["updated"] = "ID/Token";
        updatedCount++;
      } else if (!idMatch) {
        item["updated"] = "ID";
        updatedCount++;
      } else if (!tokenMatch) {
        item["updated"] = "Token";
        updatedCount++;
      }
    }
    
    return item;
  });

  console.log(`Updated ${updatedCount} entries in total`);
  return updatedData;
}

// Function to create Excel file from JSON data
function createExcelFile(jsonData, outputPath) {
  try {
    // Import the xlsx library
    const XLSX = require('xlsx');
    
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert JSON to worksheet
    const worksheet = XLSX.utils.json_to_sheet(jsonData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LocationData');
    
    // Write the workbook to a file
    XLSX.writeFile(workbook, outputPath);
    
    console.log(`Successfully created Excel file at ${outputPath}`);
  } catch (error) {
    console.error('Error creating Excel file:', error.message);
    
    if (error.message.includes('Cannot find module')) {
      console.error('You need to install the xlsx package. Run: npm install xlsx');
    }
  }
}

// Main function
async function main() {
  try {
    // Read the files
    console.log('Reading files...');
    const jsContent = fs.readFileSync(SOURCE_JS_PATH, 'utf8');
    const jsonContent = fs.readFileSync(OLD_JSON_PATH, 'utf8');
    
    // Parse JSON
    const jsonData = JSON.parse(jsonContent);
    console.log(`Successfully parsed JSON data with ${jsonData.length} entries`);
    
    // Extract data from JS file
    const jsDataMap = extractDataFromJsFile(jsContent);
    console.log(`Extracted data from JS file (${jsDataMap.size} entries)`);
    
    // Update the JSON data
    const updatedJson = updateJsonData(jsonData, jsDataMap);
    
    // Write the updated JSON to a file
    fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(updatedJson, null, 2), 'utf8');
    console.log(`Successfully wrote updated data to ${OUTPUT_JSON_PATH}`);
    
    // Create Excel file
    createExcelFile(updatedJson, OUTPUT_XLSX_PATH);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the script
main();
