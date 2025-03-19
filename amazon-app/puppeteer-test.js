const puppeteer = require('puppeteer');

async function testUI() {
  console.log('Starting UI test with Puppeteer...');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Configure viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Test Home Page
    console.log('\n📄 Testing Home Page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Take a screenshot of the homepage
    await page.screenshot({ path: 'homepage.png' });
    console.log('Screenshot saved as homepage.png');
    
    // Check page title
    const homeTitle = await page.title();
    console.log(`Page title: ${homeTitle}`);
    
    // Check for Navbar component
    const navbar = await page.$$('.navbar, nav, header');
    if (navbar.length > 0) {
      console.log('✅ Navbar component found');
    } else {
      console.log('❌ Navbar component not found');
    }
    
    // Extract and log all navigation links
    const navLinks = await page.$$('a, button[role="link"]');
    console.log(`Found ${navLinks.length} navigation elements`);
    
    const links = [];
    for (const link of navLinks) {
      const linkText = await page.evaluate(el => el.textContent?.trim(), link);
      const linkHref = await page.evaluate(el => el.href || '', link);
      
      if (linkText) {
        links.push({ text: linkText, href: linkHref });
        console.log(`- Link: "${linkText}" -> ${linkHref}`);
      }
    }
    
    // Test All Listings Report page
    console.log('\n📄 Testing All Listings Report page...');
    let foundAllListingsLink = false;
    
    // Try to find and click the All Listings Report link
    for (const navLink of navLinks) {
      const linkText = await page.evaluate(el => el.textContent?.trim(), navLink);
      const href = await page.evaluate(el => el.href, navLink);
      
      if (linkText && 
         (linkText.includes('All Listings') || 
          linkText.includes('Listings')) && 
          href &&
          href.includes('all-listings-report')) {
          
        console.log(`Found and clicking All Listings Report link: "${linkText}"`);
        
        try {
          // Click the link and wait for navigation
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            navLink.click()
          ]);
          foundAllListingsLink = true;
          break;
        } catch (err) {
          console.log(`Failed to click link: ${err.message}`);
        }
      }
    }
    
    // If clicking failed, try direct navigation
    if (!foundAllListingsLink) {
      console.log('Navigating directly to /all-listings-report page');
      await page.goto('http://localhost:3000/all-listings-report', { waitUntil: 'networkidle2' });
    }
    
    // Take a screenshot of the All Listings Report page
    await page.screenshot({ path: 'all-listings-page.png' });
    console.log('Screenshot saved as all-listings-page.png');
    
    // Check for FileUploader component
    const fileUploader = await page.$$('input[type="file"], [class*="FileUploader"], form');
    if (fileUploader.length > 0) {
      console.log('✅ File uploader component found');
    } else {
      console.log('❌ File uploader component not found');
    }
    
    // Check for any table or grid component
    const tables = await page.$$('table, [class*="InventoryTable"], [class*="handsontable"], .grid, [role="grid"]');
    if (tables.length > 0) {
      console.log('✅ Table/grid component found');
    } else {
      console.log('⚠️ Table/grid component not found - may appear after file upload');
    }
    
    // Check important text elements on the page
    const pageText = await page.evaluate(() => document.body.textContent);
    const expectedTexts = [
      'Upload', 'File', 'Inventory', 'Amazon', 'Listings'
    ];
    
    for (const text of expectedTexts) {
      if (pageText.includes(text)) {
        console.log(`✅ Found text: "${text}"`);
      } else {
        console.log(`❌ Missing text: "${text}"`);
      }
    }
    
    console.log('\nUI test completed successfully');
  } catch (error) {
    console.error('Error during UI test:', error);
  } finally {
    // Close browser
    await browser.close();
  }
}

testUI().catch(console.error); 