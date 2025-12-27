const puppeteer = require('puppeteer');

async function testWebLogin(email, password) {
    console.log(`\n=== Testing Web Login: ${email} ===`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Enable request/response logging
        page.on('response', response => {
            if (response.url().includes('/auth/login')) {
                console.log(`Response: ${response.status()} ${response.url()}`);
            }
        });

        // Navigate to login page
        console.log('Navigating to login page...');
        await page.goto('https://login.afterdarksys.com/', { waitUntil: 'networkidle2' });

        // Wait for the login form
        console.log('Waiting for login form...');
        await page.waitForSelector('form', { timeout: 10000 });

        // Take screenshot of login page
        await page.screenshot({ path: '/tmp/login-page.png' });
        console.log('Screenshot saved: /tmp/login-page.png');

        // Check what form fields exist
        const formFields = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            return inputs.map(i => ({ name: i.name, id: i.id, type: i.type, placeholder: i.placeholder }));
        });
        console.log('Form fields found:', JSON.stringify(formFields, null, 2));

        // Fill in email/username
        const emailSelector = await page.$('input[name="email"], input[name="username"], input[type="email"]');
        if (emailSelector) {
            await emailSelector.type(email);
            console.log('Entered email');
        } else {
            console.error('No email/username field found!');
        }

        // Fill in password
        const passwordSelector = await page.$('input[name="password"], input[type="password"]');
        if (passwordSelector) {
            await passwordSelector.type(password);
            console.log('Entered password');
        } else {
            console.error('No password field found!');
        }

        // Take screenshot before submit
        await page.screenshot({ path: '/tmp/login-filled.png' });
        console.log('Screenshot saved: /tmp/login-filled.png');

        // Click submit button
        const submitButton = await page.$('button[type="submit"], input[type="submit"], button.login-btn');
        if (submitButton) {
            console.log('Clicking submit button...');

            // Wait for navigation or response
            const [response] = await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
                submitButton.click()
            ]);

            console.log('Navigation complete');
        } else {
            console.error('No submit button found!');
        }

        // Wait a moment for any JS to execute
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Take screenshot after submit
        await page.screenshot({ path: '/tmp/login-result.png' });
        console.log('Screenshot saved: /tmp/login-result.png');

        // Check current URL
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);

        // Check for error messages
        const errorMessage = await page.evaluate(() => {
            const errorEl = document.querySelector('.error, .alert-error, .error-message, [class*="error"]');
            return errorEl ? errorEl.textContent : null;
        });
        if (errorMessage) {
            console.log('Error message:', errorMessage.trim());
        }

        // Check for success indicators
        const successIndicators = await page.evaluate(() => {
            return {
                hasLogout: !!document.querySelector('a[href*="logout"], button[class*="logout"]'),
                hasDashboard: document.body.textContent.includes('Dashboard') || document.body.textContent.includes('Portal'),
                hasWelcome: document.body.textContent.includes('Welcome'),
                cookies: document.cookie
            };
        });
        console.log('Success indicators:', JSON.stringify(successIndicators, null, 2));

        // Get page content for debugging
        const pageContent = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log('Page content preview:', pageContent);

        return { success: currentUrl !== 'https://login.afterdarksys.com/' || successIndicators.hasLogout };

    } catch (error) {
        console.error('Error:', error.message);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

// Test all users
async function runTests() {
    const users = [
        { email: 'admin@afterdarksys.com', password: 'Password@1225' },
        { email: 'rjc@afterdarksys.com', password: 'Password@1225' },
        { email: 'ali@afterdarksys.com', password: 'Password@1225' },
        { email: 'rams@afterdarksys.com', password: 'Password@1225' },
        { email: 'david@afterdarksys.com', password: 'Password@1225' }
    ];

    console.log('Starting Puppeteer Web Login Tests\n');
    console.log('='.repeat(50));

    for (const user of users) {
        try {
            await testWebLogin(user.email, user.password);
        } catch (err) {
            console.error(`Failed testing ${user.email}:`, err.message);
        }
    }
}

runTests().catch(console.error);
