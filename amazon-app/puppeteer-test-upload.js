/**
 * Puppeteer Test Script for Amazon Inventory Manager File Upload
 * 
 * This script tests the file upload component with background processing:
 * 1. Creates and uploads a test file to the All Listings Report page
 * 2. Verifies the upload button becomes enabled after file selection
 * 3. Clicks the upload button and monitors the upload progress
 * 4. Checks for the appearance of processing status indicators
 * 5. Captures screenshots at key steps of the process
 * 
 * Prerequisites:
 * - The Amazon Inventory Manager application must be running on localhost:3000
 * - Redis must be running for background processing
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testFileUpload() {
  console.log('======= STARTING FILE UPLOAD AND BACKGROUND PROCESSING TEST =======');
  
  // Launch a headless browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  
  // Create a new page
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to the All Listings Report page
    console.log('\n1. Navigating to All Listings Report page');
    await page.goto('http://localhost:3000/all-listings-report', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Take a screenshot of the page before upload
    await page.screenshot({ path: 'all-listings-page-before.png' });
    console.log('   ✓ Page loaded successfully');
    console.log('   ✓ Screenshot saved as all-listings-page-before.png');
    
    // Step 2: Verify the file uploader component exists
    console.log('\n2. Checking for file uploader component');
    const fileUploaderExists = await page.$('div[class*="file-uploader"]');
    if (!fileUploaderExists) {
      throw new Error('File uploader not found on page');
    }
    console.log('   ✓ File uploader component found');
    
    // Step 3: Create a test file with sample data
    console.log('\n3. Creating test file');
    const testFilePath = path.join(__dirname, 'test-report.txt');
    const fileContent = 'item-name\tseller-sku\tasin1\tproduct-id\n' +
                        'Test Item 1\tTEST-SKU-001\tB00TEST123\t123456789\n' +
                        'Test Item 2\tTEST-SKU-002\tB00TEST456\t987654321\n';
    
    await fs.writeFile(testFilePath, fileContent);
    console.log('   ✓ Created test file: test-report.txt');
    
    // Step 4: Select the file for upload
    console.log('\n4. Selecting file for upload');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input element not found');
    }
    
    await fileInput.uploadFile(testFilePath);
    console.log('   ✓ File selected successfully');
    
    // Take a screenshot after file selection
    await page.screenshot({ path: 'after-file-selection.png' });
    
    // Step 5: Check if the upload button is enabled after file selection
    console.log('\n5. Checking upload button state');
    
    const buttonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const uploadButton = buttons.find(btn => 
        btn.textContent.includes('Upload File') || 
        (btn.className && btn.className.includes('file-uploader__button'))
      );
      
      if (!uploadButton) {
        return { found: false, message: 'Button not found' };
      }
      
      return { 
        found: true, 
        enabled: !uploadButton.disabled, 
        text: uploadButton.textContent.trim(),
        className: uploadButton.className
      };
    });
    
    if (!buttonInfo.found) {
      throw new Error('Upload button not found on page');
    }
    
    if (!buttonInfo.enabled) {
      console.log('   ⚠️ Upload button is disabled, waiting for it to become enabled');
      // Wait for the button to become enabled
      await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const uploadBtn = buttons.find(btn => 
          btn.textContent.includes('Upload File') || 
          (btn.className && btn.className.includes('file-uploader__button'))
        );
        return uploadBtn && !uploadBtn.disabled;
      }, { timeout: 5000 });
    }
    
    console.log('   ✓ Upload button is enabled');
    console.log(`   ℹ️ Button details: text="${buttonInfo.text}", class="${buttonInfo.className}"`);
    
    // Step 6: Click the upload button to start the upload process
    console.log('\n6. Clicking upload button');
    
    const clickResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const uploadBtn = buttons.find(btn => 
        btn.textContent.includes('Upload File') || 
        (btn.className && btn.className.includes('file-uploader__button'))
      );
      
      if (uploadBtn && !uploadBtn.disabled) {
        uploadBtn.click();
        return { success: true, buttonText: uploadBtn.textContent, className: uploadBtn.className };
      }
      return { success: false, message: 'Button not found or disabled' };
    });
    
    if (!clickResult.success) {
      throw new Error(`Failed to click upload button: ${clickResult.message}`);
    }
    
    console.log('   ✓ Upload button clicked successfully');
    
    // Take a screenshot after clicking the upload button
    await page.screenshot({ path: 'after-button-click.png' });
    
    // Step 7: Wait for the upload to start and check for processing indicators
    console.log('\n7. Checking for upload and processing indicators');
    
    // Wait a few seconds to allow upload to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take a screenshot during the process
    await page.screenshot({ path: 'during-upload.png' });
    
    // Use a more general approach to find the processing status
    const statusElements = await page.evaluate(() => {
      // Look for various indicators of processing status
      const processingText = Array.from(document.querySelectorAll('div, p, span'))
        .filter(el => el.textContent.includes('Processing') || 
                     el.textContent.includes('processing') ||
                     el.textContent.includes('Upload') ||
                     el.textContent.includes('upload'));
      
      return {
        found: processingText.length > 0,
        elements: processingText.map(el => ({
          text: el.textContent.trim().substring(0, 100) + (el.textContent.length > 100 ? '...' : ''),
          className: el.className
        }))
      };
    });
    
    if (statusElements.found) {
      console.log('   ✓ Processing status indicators found:');
      // Display first 3 most relevant elements
      const relevantElements = statusElements.elements
        .filter(el => 
          el.text.includes('upload') || 
          el.text.includes('Upload') || 
          el.text.includes('processing') ||
          el.text.includes('Processing'))
        .slice(0, 3);
      
      relevantElements.forEach(el => {
        console.log(`      - "${el.text}" (class: ${el.className})`);
      });
    } else {
      console.log('   ⚠️ No processing status indicators found');
    }
    
    // Step 8: Wait for processing to advance and check the final state
    console.log('\n8. Waiting for processing to progress');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take final screenshot to capture any changes
    await page.screenshot({ path: 'final-status.png' });
    console.log('   ✓ Final screenshot saved as final-status.png');
    
    // Get the final processing state
    const finalProcessingState = await page.evaluate(() => {
      // Look for completed status or success message
      const statusElements = Array.from(document.querySelectorAll('div, p, span'))
        .filter(el => 
          el.textContent.includes('Complete') || 
          el.textContent.includes('complete') || 
          el.textContent.includes('Success') || 
          el.textContent.includes('success') ||
          el.textContent.includes('processed') ||
          el.textContent.includes('Processed'));
      
      // Look for error messages
      const errorElements = Array.from(document.querySelectorAll('div, p, span'))
        .filter(el => 
          el.textContent.includes('Error') || 
          el.textContent.includes('error') || 
          el.textContent.includes('Failed') || 
          el.textContent.includes('failed'));
      
      return {
        success: statusElements.length > 0,
        successElements: statusElements.map(el => ({
          text: el.textContent.trim().substring(0, 100) + (el.textContent.length > 100 ? '...' : ''),
          className: el.className
        })),
        hasErrors: errorElements.length > 0,
        errorElements: errorElements.map(el => ({
          text: el.textContent.trim().substring(0, 100) + (el.textContent.length > 100 ? '...' : ''),
          className: el.className
        }))
      };
    });
    
    // Save the final HTML for debugging purposes
    const finalHtml = await page.content();
    await fs.writeFile('final-page-html.txt', finalHtml);
    
    // Step 9: Display test summary
    console.log('\n======= TEST SUMMARY =======');
    console.log('File upload component test ' + 
                (finalProcessingState.success && !finalProcessingState.hasErrors ? 'PASSED' : 'FAILED'));
    
    if (finalProcessingState.success) {
      console.log('\nSuccess indicators found:');
      finalProcessingState.successElements.slice(0, 3).forEach(el => {
        console.log(`- "${el.text}"`);
      });
    }
    
    if (finalProcessingState.hasErrors) {
      console.log('\nError indicators found:');
      finalProcessingState.errorElements.slice(0, 3).forEach(el => {
        console.log(`- "${el.text}"`);
      });
    }
    
    console.log('\nTest artifacts:');
    console.log('- Screenshots saved: all-listings-page-before.png, after-file-selection.png, after-button-click.png, during-upload.png, final-status.png');
    console.log('- HTML snapshot: final-page-html.txt');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    
    // Take a screenshot on error
    await page.screenshot({ path: `error-${Date.now()}.png` });
    console.log(`Error screenshot saved as error-${Date.now()}.png`);
  } finally {
    // Clean up the test file
    try {
      const testFilePath = path.join(__dirname, 'test-report.txt');
      await fs.unlink(testFilePath);
      console.log('\nCleaned up test file');
    } catch (err) {
      console.warn('Could not clean up test file:', err.message);
    }
    
    // Close the browser
    await browser.close();
    console.log('Browser closed');
  }
}

// Run the test
testFileUpload().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 