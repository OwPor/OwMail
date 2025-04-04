// OwMail - Mail.tm API Implementation
// This application uses the Mail.tm API for creating temporary email addresses and managing emails
// Features: Multiple account support, theme switching, and automatic inbox polling

document.addEventListener('DOMContentLoaded', () => {
    // API endpoints
    const API_BASE_URL = 'https://api.mail.tm';
    const API_DOMAINS = `${API_BASE_URL}/domains`;
    const API_ACCOUNTS = `${API_BASE_URL}/accounts`;
    const API_TOKEN = `${API_BASE_URL}/token`;
    const API_MESSAGES = `${API_BASE_URL}/messages`;

    // DOM Elements
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    const lightIcon = document.getElementById('light-icon');
    const darkIcon = document.getElementById('dark-icon');
    
    // Auth tabs
    const backToAccountsBtn = document.getElementById('back-to-accounts');
    const createTab = document.getElementById('create-tab');
    const loginTab = document.getElementById('login-tab');
    const createForm = document.getElementById('create-form');
    const loginForm = document.getElementById('login-form');
    const authLoading = document.getElementById('auth-loading');
    
    // Account switcher section
    const accountSwitcher = document.getElementById('account-switcher');
    const accountsList = document.getElementById('accounts-list');
    const createNewAccountBtn = document.getElementById('create-new-account');
    
    // Authentication section
    const authSection = document.getElementById('auth-section');
    const domainSelect = document.getElementById('domain-select');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const generatePasswordBtn = document.getElementById('generate-password');
    const createAccountBtn = document.getElementById('create-account');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const toggleLoginPasswordBtn = document.getElementById('toggle-login-password');
    const loginButton = document.getElementById('login-button');
    const authError = document.getElementById('auth-error');

    // Email interface section
    const emailInterface = document.getElementById('email-interface');
    const currentEmail = document.getElementById('current-email');
    const copyEmailBtn = document.getElementById('copy-email');
    const showPasswordBtn = document.getElementById('show-password-btn');
    const copyPasswordBtn = document.getElementById('copy-password');
    const passwordDisplay = document.getElementById('password-display');
    const logoutBtn = document.getElementById('logout-btn');
    const refreshInboxBtn = document.getElementById('refresh-inbox');
    const messageList = document.getElementById('message-list');
    const loadingMessages = document.getElementById('loading-messages');
    const noMessages = document.getElementById('no-messages');

    // Email modal
    const emailModal = document.getElementById('email-modal');
    const modalSubject = document.getElementById('modal-subject');
    const modalFrom = document.getElementById('modal-from');
    const modalDate = document.getElementById('modal-date');
    const emailContent = document.getElementById('email-content');
    const closeModalBtn = document.getElementById('close-modal');
    const deleteEmailBtn = document.getElementById('delete-email');
    // const replyEmailBtn = document.getElementById('reply-email');

    // Toast notification
    const toast = document.getElementById('toast');

    // Current state
    let currentAccount = null;
    let currentToken = null;
    let currentPassword = null;
    let currentMessageId = null;
    let savedAccounts = [];
    let isDarkMode = true; // Default to dark mode
    const ACCOUNTS_STORAGE_KEY = 'owmail_accounts';
    const THEME_STORAGE_KEY = 'owmail_theme';
    let inboxPollingInterval = null; // For automatic inbox polling

    // Check if this is first visit and if we should create account automatically
    const FIRST_VISIT_KEY = 'owmail_first_visit';
    let isFirstVisit = localStorage.getItem(FIRST_VISIT_KEY) !== 'false';
    
    // Check if user is already logged in
    initializeApp();

    // Initialize the application and check for existing session
    function initializeApp() {
        // Set up all event listeners first to ensure they're available
        // regardless of the initialization path
        setupEventListeners();
        
        // Initialize theme
        initializeTheme();
        
        // Load saved accounts
        loadSavedAccounts();
        
        // Check for active account
        const activeAccountEmail = localStorage.getItem('owmail_active_account');
        
        // First time visitor: create random account if no accounts exist
        if (isFirstVisit && savedAccounts.length === 0) {
            fetchDomainsAndCreateRandomAccount();
            return;
        }
        
        if (activeAccountEmail && savedAccounts.length > 0) {
            // Find the active account in saved accounts
            const activeAccount = savedAccounts.find(account => account.email === activeAccountEmail);
            
            if (activeAccount) {
                currentAccount = activeAccount.email;
                currentToken = activeAccount.token;
                currentPassword = activeAccount.password;
                
                // Verify token is still valid by attempting to fetch messages
                checkTokenAndShowEmailInterface();
            } else {
                // Active account not found in saved accounts, show available accounts if any
                if (savedAccounts.length > 0) {
                    showAccountSwitcher();
                } else {
                    // No accounts, fetch domains for new account creation
                    fetchDomains();
                }
            }
        } else if (savedAccounts.length > 0) {
            // No active account but we have saved accounts, show account switcher
            showAccountSwitcher();
        } else {
            // No accounts at all, fetch available domains for new account
            fetchDomains();
        }
    }

    // Load saved accounts from localStorage
    function loadSavedAccounts() {
        const accountsJson = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (accountsJson) {
            try {
                savedAccounts = JSON.parse(accountsJson);
            } catch (error) {
                console.error('Error parsing saved accounts:', error);
                savedAccounts = [];
            }
        } else {
            savedAccounts = [];
            
            // Check for legacy single account storage
            const legacyAccount = localStorage.getItem('tempmail_account');
            const legacyToken = localStorage.getItem('tempmail_token');
            const legacyPassword = localStorage.getItem('tempmail_password');
            
            if (legacyAccount && legacyToken) {
                // Migrate legacy account to new format
                savedAccounts.push({
                    email: legacyAccount,
                    token: legacyToken,
                    password: legacyPassword || '',
                    created: new Date().toISOString()
                });
                
                // Save migrated account
                saveAccounts();
                
                // Remove legacy storage
                localStorage.removeItem('tempmail_account');
                localStorage.removeItem('tempmail_token');
                localStorage.removeItem('tempmail_password');
                localStorage.removeItem('owmail_account');
                localStorage.removeItem('owmail_token');
                localStorage.removeItem('owmail_password');
            }
        }
    }

    // Save accounts to localStorage
    function saveAccounts() {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(savedAccounts));
    }

    // Show account switcher with all saved accounts
    function showAccountSwitcher() {
        // Clear the auth section
        authSection.classList.add('hidden');
        emailInterface.classList.add('hidden');
        
        // Clear the accounts list
        accountsList.innerHTML = '';
        
        // Add each account
        savedAccounts.forEach(account => {
            const accountRow = document.createElement('div');
            accountRow.className = 'flex items-center justify-between mb-2';
            
            // Create the account item (clickable)
            const accountItem = document.createElement('div');
            accountItem.className = `account-chip flex-1 px-3 py-2 bg-gray-700 text-gray-200 rounded-l-md cursor-pointer hover:bg-gray-600 border border-gray-600 text-sm${account.email === currentAccount ? ' active' : ''}`;
            accountItem.textContent = account.email;
            accountItem.dataset.email = account.email;
            
            accountItem.addEventListener('click', () => {
                switchToAccount(account.email);
            });
            
            // Create the delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-account px-2 py-2 bg-red-600 text-white rounded-r-md hover:bg-red-700 border border-gray-600 text-sm';
            deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>';
            deleteButton.title = 'Delete account';
            
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();  // Prevent triggering the account click
                deleteAccount(account.email);
            });
            
            // Add elements to the row
            accountRow.appendChild(accountItem);
            accountRow.appendChild(deleteButton);
            
            // Add row to the accounts list
            accountsList.appendChild(accountRow);
        });
        
        // Show the account switcher
        accountSwitcher.classList.remove('hidden');
    }

    // Verify token is still valid and show email interface if it is
    async function checkTokenAndShowEmailInterface() {
        try {
            const response = await fetch(`${API_MESSAGES}?page=1`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });

            if (response.ok) {
                // Token is valid, show email interface
                showEmailInterface();
                fetchMessages();
            } else {
                // Token is invalid, clear storage and show auth section
                logout();
            }
        } catch (error) {
            console.error('Error checking token:', error);
            logout();
        }
    }

    // Set up all event listeners
    function setupEventListeners() {
        // Theme toggle
        themeToggle.addEventListener('click', toggleTheme);
        
        // Auth tabs
        backToAccountsBtn.addEventListener('click', showAccountSwitcher);
        createTab.addEventListener('click', () => switchAuthTab('create'));
        loginTab.addEventListener('click', () => switchAuthTab('login'));
        
        // Account switcher
        createNewAccountBtn.addEventListener('click', showAuthSection);
        
        // Authentication section
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
        toggleLoginPasswordBtn.addEventListener('click', toggleLoginPasswordVisibility);
        generatePasswordBtn.addEventListener('click', generatePassword);
        createAccountBtn.addEventListener('click', createAccount);
        loginButton.addEventListener('click', loginToAccount);

        // Email interface
        copyEmailBtn.addEventListener('click', () => copyToClipboard(currentAccount));
        showPasswordBtn.addEventListener('click', toggleSavedPasswordVisibility);
        copyPasswordBtn.addEventListener('click', () => copyToClipboard(currentPassword));
        logoutBtn.addEventListener('click', showAccountSwitcher); // Changed from logout to account switcher
        refreshInboxBtn.addEventListener('click', fetchMessages);

        // Email modal
        closeModalBtn.addEventListener('click', closeEmailModal);
        deleteEmailBtn.addEventListener('click', deleteCurrentEmail);
        // replyEmailBtn.addEventListener('click', replyToCurrentEmail);

        // Close modal when clicking outside
        emailModal.addEventListener('click', (e) => {
            if (e.target === emailModal) {
                closeEmailModal();
            }
        });
    }
    
    // Switch to a specific account
    function switchToAccount(email) {
        const account = savedAccounts.find(acc => acc.email === email);
        if (!account) {
            showToast('Account not found', 'error');
            return;
        }
        
        // Set as active account
        currentAccount = account.email;
        currentToken = account.token;
        currentPassword = account.password;
        localStorage.setItem('owmail_active_account', account.email);
        
        // Update account list to show active account
        const accountItems = accountsList.querySelectorAll('.account-chip');
        accountItems.forEach(item => {
            if (item.dataset.email === email) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Clear message list before showing the new account's messages
        messageList.innerHTML = '';
        
        // Check token validity and show email interface
        checkTokenAndShowEmailInterface();
    }
    
    // Switch between auth tabs (create or login)
    function switchAuthTab(tab) {
        if (tab === 'create') {
            createTab.classList.add('text-indigo-300', 'border-b-2', 'border-indigo-500');
            createTab.classList.remove('text-gray-400');
            loginTab.classList.remove('text-indigo-300', 'border-b-2', 'border-indigo-500');
            loginTab.classList.add('text-gray-400');
            
            createForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        } else {
            loginTab.classList.add('text-indigo-300', 'border-b-2', 'border-indigo-500');
            loginTab.classList.remove('text-gray-400');
            createTab.classList.remove('text-indigo-300', 'border-b-2', 'border-indigo-500');
            createTab.classList.add('text-gray-400');
            
            loginForm.classList.remove('hidden');
            createForm.classList.add('hidden');
        }
        
        hideAuthError();
    }
    
    // Toggle login password visibility
    function toggleLoginPasswordVisibility() {
        if (loginPasswordInput.type === 'password') {
            loginPasswordInput.type = 'text';
            toggleLoginPasswordBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
            `;
        } else {
            loginPasswordInput.type = 'password';
            toggleLoginPasswordBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                </svg>
            `;
        }
    }
    
    // Show authentication section for creating a new account
    function showAuthSection() {
        // Hide account switcher and email interface
        accountSwitcher.classList.add('hidden');
        emailInterface.classList.add('hidden');
        
        // Show auth section with create tab active
        authSection.classList.remove('hidden');
        switchAuthTab('create');
        
        // Fetch domains if needed
        if (domainSelect.options.length <= 1) {
            fetchDomains();
        }
        
        // Clear input fields
        usernameInput.value = '';
        passwordInput.value = '';
        loginEmailInput.value = '';
        loginPasswordInput.value = '';
        hideAuthError();
    }
    
    // Login to an existing account
    async function loginToAccount() {
        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value.trim();
        
        // Validate inputs
        if (!email) {
            showAuthError('Please enter your email address');
            return;
        }
        
        if (!password) {
            showAuthError('Please enter your password');
            return;
        }
        
        // Clear previous error
        hideAuthError();
        
        // Show loading indicator
        showAuthLoading(true);
        loginButton.disabled = true;
        
        try {
            // Get JWT token
            const tokenData = await getAuthToken(email, password);
            
            // Check if account already exists in saved accounts
            const existingAccount = savedAccounts.find(acc => acc.email === email);
            if (existingAccount) {
                // Update token if needed
                existingAccount.token = tokenData.token;
                existingAccount.password = password;
            } else {
                // Add to saved accounts
                savedAccounts.push({
                    email: email,
                    token: tokenData.token,
                    password: password,
                    created: new Date().toISOString()
                });
            }
            
            // Save to localStorage
            saveAccounts();
            
            // Set as active account
            currentAccount = email;
            currentToken = tokenData.token;
            currentPassword = password;
            localStorage.setItem('owmail_active_account', email);
            
            // Show email interface
            showEmailInterface();
            fetchMessages();
            
            showToast(`Logged in: ${email}`);
        } catch (error) {
            console.error('Login error:', error);
            showAuthError(error.message || 'Failed to login. Please check your credentials.');
        } finally {
            // Hide loading indicator
            showAuthLoading(false);
            loginButton.disabled = false;
        }
    }
    
    // Get authentication token from Mail.tm API
    async function getAuthToken(email, password) {
        const response = await fetch(API_TOKEN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address: email,
                password: password
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Authentication failed: ${response.status}`);
        }
        
        return await response.json();
    }
    
    // Show/hide auth loading indicator
    function showAuthLoading(show) {
        if (show) {
            authLoading.classList.remove('hidden');
        } else {
            authLoading.classList.add('hidden');
        }
    }
    
    // Fetch domains and create a random account for first-time visitors
    async function fetchDomainsAndCreateRandomAccount() {
        try {
            showAuthLoading(true);
            
            // Fetch available domains first
            const response = await fetch(API_DOMAINS);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch domains: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data['hydra:member'] || data['hydra:member'].length === 0) {
                throw new Error('No domains available');
            }
            
            // Select a random domain
            const randomDomain = data['hydra:member'][Math.floor(Math.random() * data['hydra:member'].length)].domain;
            
            // Generate a random username
            const randomUsername = generateRandomUsername();
            
            // Generate a secure password
            const randomPassword = generateRandomPassword();
            
            // Create the account
            const email = `${randomUsername}@${randomDomain}`;
            
            // Create account
            const accountResponse = await fetch(API_ACCOUNTS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: email,
                    password: randomPassword
                })
            });
            
            if (!accountResponse.ok) {
                // If account creation fails, just show the regular interface
                localStorage.setItem(FIRST_VISIT_KEY, 'false');
                showAuthSection();
                return;
            }
            
            const accountData = await accountResponse.json();
            
            // Get JWT token
            const tokenResponse = await fetch(API_TOKEN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: email,
                    password: randomPassword
                })
            });
            
            if (!tokenResponse.ok) {
                // If token fetch fails, just show the regular interface
                localStorage.setItem(FIRST_VISIT_KEY, 'false');
                showAuthSection();
                return;
            }
            
            const tokenData = await tokenResponse.json();
            
            // Add to saved accounts
            savedAccounts.push({
                email: email,
                token: tokenData.token,
                password: randomPassword,
                created: new Date().toISOString()
            });
            
            // Save to localStorage
            saveAccounts();
            
            // Set as active account
            currentAccount = email;
            currentToken = tokenData.token;
            currentPassword = randomPassword;
            localStorage.setItem('owmail_active_account', email);
            
            // Ensure password display is ready
            passwordDisplay.textContent = randomPassword;
            
            // Mark that this is no longer the first visit
            localStorage.setItem(FIRST_VISIT_KEY, 'false');
            isFirstVisit = false;
            
            // Make sure all event listeners are attached
            setupEventListeners();
            
            // Show email interface
            showEmailInterface();
            
            // Set password display content immediately for auto-created accounts
            // This ensures the show password button works immediately
            passwordDisplay.textContent = randomPassword;
            
            // Make sure the inbox is empty before fetching messages
            messageList.innerHTML = '';
            fetchMessages();
            
            showToast(`Welcome! Your temporary email ${email} is ready. We've automatically created this for you.`, 'success', 6000);
        } catch (error) {
            console.error('Error creating random account:', error);
            // If anything fails, just show the regular interface
            localStorage.setItem(FIRST_VISIT_KEY, 'false');
            showAuthSection();
        } finally {
            showAuthLoading(false);
        }
    }
    
    // Generate a random username
    function generateRandomUsername() {
        const adjectives = ['cool', 'smart', 'happy', 'brave', 'bright', 'calm', 'eager', 'fair', 'kind', 'proud', 'wise', 'witty'];
        const nouns = ['tiger', 'eagle', 'fox', 'panda', 'wolf', 'lion', 'bear', 'hawk', 'deer', 'duck', 'owl', 'crow'];
        const numbers = Math.floor(Math.random() * 9999);
        
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${adjective}${noun}${numbers}`;
    }
    
    // Generate a random password
    function generateRandomPassword() {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=<>?';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        
        return password;
    }
    
    // Fetch available domains from Mail.tm API
    async function fetchDomains() {
        try {
            showToast('Fetching available domains...');
            const response = await fetch(API_DOMAINS);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch domains: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Clear the select options
            domainSelect.innerHTML = '';
            
            if (data['hydra:member'] && data['hydra:member'].length > 0) {
                // Add domains to select dropdown
                data['hydra:member'].forEach(domain => {
                    const option = document.createElement('option');
                    option.value = domain.domain;
                    option.textContent = domain.domain;
                    domainSelect.appendChild(option);
                });
                
                showToast('Domains loaded successfully');
            } else {
                // No domains available
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No domains available';
                option.disabled = true;
                option.selected = true;
                domainSelect.appendChild(option);
                
                showToast('No domains available', 'error');
            }
        } catch (error) {
            console.error('Error fetching domains:', error);
            showToast('Failed to fetch domains. Please try again later.', 'error');
            
            // Add a placeholder option
            domainSelect.innerHTML = '<option value="" disabled selected>Failed to load domains</option>';
        }
    }

    // Toggle password visibility
    function togglePasswordVisibility() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePasswordBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
            `;
        } else {
            passwordInput.type = 'password';
            togglePasswordBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                </svg>
            `;
        }
    }

    // Generate a secure random password
    function generatePassword() {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=<>?';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        
        passwordInput.value = password;
        showToast('Password generated');
        
        // Show password when generated
        if (passwordInput.type === 'password') {
            togglePasswordVisibility();
        }
    }

    // Create a new Mail.tm account
    async function createAccount() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const domain = domainSelect.value;
        
        // Validate inputs
        if (!username) {
            showAuthError('Please enter a username');
            return;
        }
        
        if (!password) {
            showAuthError('Please enter a password');
            return;
        }
        
        if (!domain) {
            showAuthError('Please select a domain');
            return;
        }
        
        // Clear previous error
        hideAuthError();
        
        // Disable create button and show loading
        createAccountBtn.disabled = true;
        createAccountBtn.innerHTML = 'Creating...';
        
        try {
            const email = `${username}@${domain}`;
            
            // Check if account already exists in our saved accounts
            const existingAccount = savedAccounts.find(acc => acc.email === email);
            if (existingAccount) {
                throw new Error('This email address is already in your account list');
            }
            
            // Create account
            const accountResponse = await fetch(API_ACCOUNTS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: email,
                    password: password
                })
            });
            
            if (!accountResponse.ok) {
                const errorData = await accountResponse.json();
                throw new Error(errorData.detail || `Failed to create account: ${accountResponse.status}`);
            }
            
            const accountData = await accountResponse.json();
            
            // Get JWT token
            const tokenResponse = await fetch(API_TOKEN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: email,
                    password: password
                })
            });
            
            if (!tokenResponse.ok) {
                throw new Error(`Failed to get token: ${tokenResponse.status}`);
            }
            
            const tokenData = await tokenResponse.json();
            
            // Add to saved accounts
            savedAccounts.push({
                email: email,
                token: tokenData.token,
                password: password,
                created: new Date().toISOString()
            });
            
            // Save to localStorage
            saveAccounts();
            
            // Set as active account
            currentAccount = email;
            currentToken = tokenData.token;
            currentPassword = password;
            localStorage.setItem('owmail_active_account', email);
            
            // Show email interface
            showEmailInterface();
            fetchMessages();
            
            showToast(`Account created: ${email}`);
        } catch (error) {
            console.error('Error creating account:', error);
            showAuthError(error.message || 'Failed to create account. Please try again.');
        } finally {
            // Re-enable create button
            createAccountBtn.disabled = false;
            createAccountBtn.innerHTML = 'Create Account';
        }
    }

    // Show authentication error
    function showAuthError(message) {
        authError.textContent = message;
        authError.classList.remove('hidden');
    }

    // Hide authentication error
    function hideAuthError() {
        authError.textContent = '';
        authError.classList.add('hidden');
    }

    // Show email interface and hide authentication section and account switcher
    function showEmailInterface() {
        authSection.classList.add('hidden');
        accountSwitcher.classList.add('hidden');
        emailInterface.classList.remove('hidden');
        currentEmail.textContent = currentAccount;
        
        // Reset password display state
        passwordDisplay.classList.add('hidden');
        copyPasswordBtn.classList.add('hidden');
        showPasswordBtn.textContent = 'Show Password';
        
        // Start automatic inbox polling
        startInboxPolling();
    }

    // Toggle saved password visibility
    function toggleSavedPasswordVisibility() {
        // Ensure we have the current password for this account
        if (!currentPassword && currentAccount) {
            // Try to find current password in saved accounts
            const account = savedAccounts.find(acc => acc.email === currentAccount);
            if (account && account.password) {
                currentPassword = account.password;
            }
        }
        
        // Always set the text content before toggling visibility
        // This ensures it's ready when needed for first-time visibility
        if (currentPassword) {
            passwordDisplay.textContent = currentPassword;
        }
        
        // Now toggle visibility
        if (passwordDisplay.classList.contains('hidden')) {
            if (currentPassword) {
                passwordDisplay.classList.remove('hidden');
                copyPasswordBtn.classList.remove('hidden');
                showPasswordBtn.textContent = 'Hide Password';
            } else {
                showToast('Password not available', 'error');
            }
        } else {
            passwordDisplay.classList.add('hidden');
            copyPasswordBtn.classList.add('hidden');
            showPasswordBtn.textContent = 'Show Password';
        }
    }

    // Completely log out and delete all accounts
    function logout() {
        if (confirm('Are you sure you want to remove all accounts and log out completely?')) {
            // Clear all storage
            localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
            localStorage.removeItem('owmail_active_account');
            
            // Reset state
            currentAccount = null;
            currentToken = null;
            currentPassword = null;
            savedAccounts = [];
            
            // Show auth section
            authSection.classList.remove('hidden');
            accountSwitcher.classList.add('hidden');
            emailInterface.classList.add('hidden');
            
            // Reset password display
            passwordDisplay.classList.add('hidden');
            copyPasswordBtn.classList.add('hidden');
            showPasswordBtn.textContent = 'Show Password';
            
            // Clear message list
            messageList.innerHTML = '';
            
            // Fetch domains
            fetchDomains();
            
            showToast('Logged out successfully and removed all accounts');
        }
    }
    
    // Remove current account
    function removeCurrentAccount() {
        if (!currentAccount) return;
        
        // Remove from saved accounts
        const index = savedAccounts.findIndex(acc => acc.email === currentAccount);
        if (index !== -1) {
            savedAccounts.splice(index, 1);
            saveAccounts();
        }
        
        // Reset active account
        localStorage.removeItem('owmail_active_account');
        
        // Stop inbox polling
        stopInboxPolling();
        
        // Reset state
        currentAccount = null;
        currentToken = null;
        currentPassword = null;
        
        // Show account switcher or auth section based on remaining accounts
        if (savedAccounts.length > 0) {
            showAccountSwitcher();
        } else {
            authSection.classList.remove('hidden');
            accountSwitcher.classList.add('hidden');
            emailInterface.classList.add('hidden');
            fetchDomains();
        }
        
        showToast('Account removed successfully');
    }
    
    // Delete a specific account by email
    function deleteAccount(email) {
        if (!email) {
            showToast('No account specified', 'error');
            return;
        }
        
        // Set up delete confirmation modal
        const deleteConfirmModal = document.getElementById('delete-confirm-modal');
        const deleteConfirmMessage = document.getElementById('delete-confirm-message');
        const deleteCancelBtn = document.getElementById('delete-cancel-btn');
        const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
        
        // Update confirmation message
        deleteConfirmMessage.textContent = `Are you sure you want to delete the account ${email}? This action cannot be undone.`;
        
        // Show the modal
        deleteConfirmModal.classList.remove('hidden');
        
        // Set up event handlers for cancel and confirm buttons
        const cancelHandler = () => {
            deleteConfirmModal.classList.add('hidden');
            deleteCancelBtn.removeEventListener('click', cancelHandler);
            deleteConfirmBtn.removeEventListener('click', confirmHandler);
        };
        
        const confirmHandler = () => {
            deleteConfirmModal.classList.add('hidden');
            deleteCancelBtn.removeEventListener('click', cancelHandler);
            deleteConfirmBtn.removeEventListener('click', confirmHandler);
            
            // Proceed with account deletion
            performAccountDeletion(email);
        };
        
        deleteCancelBtn.addEventListener('click', cancelHandler);
        deleteConfirmBtn.addEventListener('click', confirmHandler);
    }
    
    // Perform the actual deletion of an account
    function performAccountDeletion(email) {
        // Find the account index
        const accountIndex = savedAccounts.findIndex(acc => acc.email === email);
        
        if (accountIndex === -1) {
            showToast('Account not found in saved accounts', 'error');
            return;
        }
        
        // Check if it's the current account
        const isCurrentAccount = (email === currentAccount);
        
        // Remove the account from saved accounts
        savedAccounts.splice(accountIndex, 1);
        
        // Save updated accounts list
        saveAccounts();
        
        // If it was the current account, reset current info
        if (isCurrentAccount) {
            // Reset active account
            localStorage.removeItem('owmail_active_account');
            
            // Stop inbox polling
            stopInboxPolling();
            
            // Reset state
            currentAccount = null;
            currentToken = null;
            currentPassword = null;
        }
        
        // Refresh the account switcher
        showAccountSwitcher();
        
        // If we have no accounts left, show the auth section
        if (savedAccounts.length === 0) {
            authSection.classList.remove('hidden');
            accountSwitcher.classList.add('hidden');
            emailInterface.classList.add('hidden');
            fetchDomains();
        } else if (isCurrentAccount && savedAccounts.length > 0) {
            // If it was the current account and we have others, switch to the first one
            switchToAccount(savedAccounts[0].email);
        }
        
        showToast(`Account ${email} deleted`, 'success');
    }
    
    // Close modal when clicking outside (ESC key is handled by the browser)
    document.getElementById('delete-confirm-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('delete-confirm-modal')) {
            document.getElementById('delete-confirm-modal').classList.add('hidden');
        }
    });

    // Start automatic inbox polling
    function startInboxPolling() {
        // Clear any existing interval
        stopInboxPolling();
        
        // Fetch messages immediately (but don't show loading state)
        fetchMessages(true);
        
        // Set up polling interval (every 3 seconds)
        inboxPollingInterval = setInterval(() => {
            fetchMessages(true); // true = silent update (no toast)
        }, 3000);
    }
    
    // Stop inbox polling
    function stopInboxPolling() {
        if (inboxPollingInterval) {
            clearInterval(inboxPollingInterval);
            inboxPollingInterval = null;
        }
    }
    
    // Fetch messages from Mail.tm API
    async function fetchMessages(silent = false) {
        if (!currentToken) {
            if (!silent) {
                showToast('You need to be logged in to fetch messages', 'error');
            }
            return;
        }
        
        // Only show loading indicator on manual refresh (not silent) and when inbox is empty
        if (!silent && messageList.children.length === 0) {
            loadingMessages.classList.remove('hidden');
            noMessages.classList.add('hidden');
        }
        
        try {
            const response = await fetch(`${API_MESSAGES}?page=1`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch messages: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Hide loading
            // Always hide loading indicator
            loadingMessages.classList.add('hidden');
            
            if (data['hydra:member'] && data['hydra:member'].length > 0) {
                // Get tracked messages from localStorage to avoid duplicate notifications
                const VIEWED_MESSAGES_KEY = `owmail_viewed_messages_${currentAccount}`;
                let viewedMessageIds = [];
                try {
                    const savedIds = localStorage.getItem(VIEWED_MESSAGES_KEY);
                    if (savedIds) {
                        viewedMessageIds = JSON.parse(savedIds);
                    }
                } catch (e) {
                    console.error('Error parsing viewed messages:', e);
                }
                
                // Get current messages in the UI and from the API
                const currentMessageIds = Array.from(messageList.querySelectorAll('.message-item')).map(item => item.dataset.id);
                const fetchedIds = data['hydra:member'].map(message => message.id);
                
                // Messages that are new relative to current display
                const newMessages = data['hydra:member'].filter(message => !currentMessageIds.includes(message.id));
                
                // Messages that have never been viewed before (truly new)
                const trulyNewMessages = newMessages.filter(message => !viewedMessageIds.includes(message.id));
                
                // Add truly new messages to viewed set
                if (trulyNewMessages.length > 0) {
                    trulyNewMessages.forEach(message => {
                        if (!viewedMessageIds.includes(message.id)) {
                            viewedMessageIds.push(message.id);
                        }
                    });
                    
                    // Save updated viewed message ids
                    localStorage.setItem(VIEWED_MESSAGES_KEY, JSON.stringify(viewedMessageIds));
                }
                
                // Check if there are any deleted messages
                const deletedMessageIds = currentMessageIds.filter(id => !fetchedIds.includes(id));
                
                // Only remove messages that were actually deleted
                if (deletedMessageIds.length > 0) {
                    deletedMessageIds.forEach(id => {
                        const messageElement = messageList.querySelector(`[data-id="${id}"]`);
                        if (messageElement) {
                            messageElement.remove();
                        }
                    });
                }
                
                // Add new messages to the list without clearing existing ones
                if (newMessages.length > 0) {
                    newMessages.forEach(message => {
                        // Add to the beginning of the list
                        if (messageList.firstChild) {
                            messageList.insertBefore(createMessageListItem(message), messageList.firstChild);
                        } else {
                            addMessageToList(message);
                        }
                    });
                    
                    // Only show notification for truly new messages (not previously viewed)
                    if (trulyNewMessages.length > 0) {
                        showToast(`Received ${trulyNewMessages.length} new message${trulyNewMessages.length > 1 ? 's' : ''}`, 'success');
                    }
                }
                
                // Update the no-messages display based on current state
                if (messageList.children.length === 0) {
                    noMessages.classList.remove('hidden');
                } else {
                    noMessages.classList.add('hidden');
                }
            } else if (messageList.children.length === 0) {
                // Only show no messages if the list is actually empty
                noMessages.classList.remove('hidden');
            }
            
            if (!silent) {
                showToast('Inbox refreshed');
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            loadingMessages.classList.add('hidden');
            noMessages.classList.remove('hidden');
            noMessages.textContent = 'Failed to fetch messages. Please try again later.';
            showToast('Failed to fetch messages', 'error');
        }
    }

    // Create a message list item element
    function createMessageListItem(message) {
        const listItem = document.createElement('li');
        listItem.className = 'message-item py-4 px-6 cursor-pointer';
        listItem.dataset.id = message.id;
        
        // Format date
        const messageDate = new Date(message.createdAt);
        const formattedDate = messageDate.toLocaleString();
        
        // Check if message is unread (you can implement this logic based on your needs)
        const isUnread = !message.seen; // This property might not exist in the API, just an example
        
        listItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="flex-shrink-0 bg-indigo-900 bg-opacity-20 rounded-full p-1">
                    <svg class="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-200 truncate">${message.subject || 'No Subject'}</p>
                    <p class="text-sm text-gray-400 truncate">${message.from.name || message.from.address}</p>
                </div>
                <div class="text-xs text-gray-500">${formattedDate}</div>
            </div>
        `;
        
        // Add click event
        listItem.addEventListener('click', () => {
            fetchEmailContent(message.id);
        });
        
        return listItem;
    }
    
    // Add a message to the inbox list
    function addMessageToList(message) {
        const listItem = createMessageListItem(message);
        messageList.appendChild(listItem);
    }

    // Fetch email content from Mail.tm API
    async function fetchEmailContent(messageId) {
        if (!currentToken) {
            showToast('You need to be logged in to view emails', 'error');
            return;
        }
        
        try {
            showToast('Loading email content...');
            
            const response = await fetch(`${API_MESSAGES}/${messageId}`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch email content: ${response.status}`);
            }
            
            const message = await response.json();
            
            // Save current message ID
            currentMessageId = messageId;
            
            // Mark this message as viewed to avoid duplicate notifications
            const VIEWED_MESSAGES_KEY = `owmail_viewed_messages_${currentAccount}`;
            let viewedMessageIds = [];
            try {
                const savedIds = localStorage.getItem(VIEWED_MESSAGES_KEY);
                if (savedIds) {
                    viewedMessageIds = JSON.parse(savedIds);
                }
                if (!viewedMessageIds.includes(messageId)) {
                    viewedMessageIds.push(messageId);
                    localStorage.setItem(VIEWED_MESSAGES_KEY, JSON.stringify(viewedMessageIds));
                }
            } catch (e) {
                console.error('Error updating viewed messages:', e);
            }
            
            // Format date
            const messageDate = new Date(message.createdAt);
            const formattedDate = messageDate.toLocaleString();
            
            // Update modal content
            modalSubject.textContent = message.subject || 'No Subject';
            modalFrom.innerHTML = `From: <span class="font-medium">${message.from.name ? `${message.from.name} &lt;${message.from.address}&gt;` : message.from.address}</span>`;
            modalDate.textContent = `Date: ${formattedDate}`;
            
            // Display HTML or text content
            if (message.html && message.html.length > 0) {
                // Sanitize HTML content to prevent XSS
                const sanitizedHtml = sanitizeHtml(message.html);
                emailContent.innerHTML = sanitizedHtml;
            } else if (message.text) {
                // Format plain text
                emailContent.innerHTML = `<pre style="white-space: pre-wrap;">${message.text}</pre>`;
            } else {
                emailContent.innerHTML = '<p>No content</p>';
            }
            
            // Open modal
            openEmailModal();
            
            showToast('Email loaded successfully');
        } catch (error) {
            console.error('Error fetching email content:', error);
            showToast('Failed to load email content', 'error');
        }
    }

    // Sanitize HTML content to prevent XSS
    function sanitizeHtml(html) {
        // Basic sanitization - this is a simplified version
        // In a production app, use a library like DOMPurify
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove potentially dangerous elements and attributes
        const scripts = tempDiv.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        // Handle images - make them responsive
        const images = tempDiv.querySelectorAll('img');
        images.forEach(img => {
            // Remove event handlers
            [...img.attributes].forEach(attr => {
                if (attr.name.startsWith('on')) {
                    img.removeAttribute(attr.name);
                }
            });
            
            // Make images responsive
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
        });
        
        return tempDiv.innerHTML;
    }

    // Open email modal
    function openEmailModal() {
        emailModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    // Close email modal
    function closeEmailModal() {
        emailModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        currentMessageId = null;
    }

    // Delete current email
    async function deleteCurrentEmail() {
        if (!currentToken || !currentMessageId) {
            showToast('Cannot delete email', 'error');
            return;
        }
        
        try {
            showToast('Deleting email...');
            
            const response = await fetch(`${API_MESSAGES}/${currentMessageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete email: ${response.status}`);
            }
            
            // Remove email from list
            const listItem = messageList.querySelector(`[data-id="${currentMessageId}"]`);
            if (listItem) {
                listItem.remove();
            }
            
            // Close modal
            closeEmailModal();
            
            // Check if inbox is empty
            if (messageList.children.length === 0) {
                noMessages.classList.remove('hidden');
            }
            
            // Continue polling (since UI is manually changed)
            fetchMessages(true);
            
            showToast('Email deleted successfully');
        } catch (error) {
            console.error('Error deleting email:', error);
            showToast('Failed to delete email', 'error');
        }
    }

    // Reply to current email using mailto link
    // function replyToCurrentEmail() {
    //     if (!currentMessageId) {
    //         showToast('Cannot reply to email', 'error');
    //         return;
    //     }
        
    //     const listItem = messageList.querySelector(`[data-id="${currentMessageId}"]`);
    //     if (!listItem) return;
        
    //     const subject = modalSubject.textContent;
    //     const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    //     const fromMatch = modalFrom.textContent.match(/From: (.+)/);
    //     const fromAddress = fromMatch ? fromMatch[1].trim().replace(/.*<(.+)>.*/, '$1') : '';
        
    //     if (fromAddress) {
    //         const mailtoLink = `mailto:${fromAddress}?subject=${encodeURIComponent(replySubject)}`;
    //         window.open(mailtoLink);
    //     } else {
    //         showToast('Could not find recipient address', 'error');
    //     }
    // }

    // Copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast('Copied to clipboard');
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                showToast('Failed to copy to clipboard', 'error');
            });
    }

    // Show toast notification
    function showToast(message, type = 'success', duration = 3000) {
        // Set toast styling based on type
        if (type === 'error') {
            toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg transform transition-transform duration-300 translate-y-20 opacity-0';
        } else {
            toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg transform transition-transform duration-300 translate-y-20 opacity-0';
        }
        
        toast.textContent = message;
        
        // Show the toast
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);
        
        // Hide after specified duration
        setTimeout(() => {
            toast.classList.remove('toast-show');
        }, duration);
    }
    
    // Initialize theme based on saved preference or default to dark mode
    function initializeTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('tempmail_theme');
        
        if (savedTheme === 'light') {
            enableLightMode();
        } else {
            // Default to dark mode (already set in HTML)
            enableDarkMode();
        }
    }
    
    // Toggle between light and dark themes
    function toggleTheme() {
        if (isDarkMode) {
            enableLightMode();
        } else {
            enableDarkMode();
        }
    }
    
    // Enable light mode
    function enableLightMode() {
        document.body.classList.add('light-mode');
        document.body.classList.remove('bg-gray-900', 'text-gray-100');
        document.body.classList.add('bg-gray-100', 'text-gray-900');
        
        // Update UI elements for light mode
        updateUIForLightMode();
        
        // Show the appropriate icon
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
        
        // Update state and save preference
        isDarkMode = false;
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
    
    // Enable dark mode
    function enableDarkMode() {
        document.body.classList.remove('light-mode');
        document.body.classList.remove('bg-gray-100', 'text-gray-900');
        document.body.classList.add('bg-gray-900', 'text-gray-100');
        
        // Update UI elements for dark mode
        updateUIForDarkMode();
        
        // Show the appropriate icon
        darkIcon.classList.add('hidden');
        lightIcon.classList.remove('hidden');
        
        // Update state and save preference
        isDarkMode = true;
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    }
    
    // Update UI elements for light mode
    function updateUIForLightMode() {
        // Update all gray-800 background elements to white or light gray
        document.querySelectorAll('.bg-gray-800').forEach(el => {
            el.classList.remove('bg-gray-800');
            el.classList.add('bg-white');
        });
        
        // Update all gray-700 background elements to light gray
        document.querySelectorAll('.bg-gray-700').forEach(el => {
            el.classList.remove('bg-gray-700');
            el.classList.add('bg-gray-200');
        });
        
        // Update text colors
        document.querySelectorAll('.text-gray-200, .text-gray-300, .text-gray-400').forEach(el => {
            el.classList.remove('text-gray-200', 'text-gray-300', 'text-gray-400');
            el.classList.add('text-gray-800');
        });
        
        // Update borders
        document.querySelectorAll('.border-gray-600, .border-gray-700').forEach(el => {
            el.classList.remove('border-gray-600', 'border-gray-700');
            el.classList.add('border-gray-300');
        });
        
        // Update the header text color
        const headerTitle = document.querySelector('h1');
        if (headerTitle) {
            headerTitle.classList.remove('text-indigo-400');
            headerTitle.classList.add('text-indigo-600');
        }
    }
    
    // Update UI elements for dark mode
    function updateUIForDarkMode() {
        // Update all white or light gray background elements to gray-800
        document.querySelectorAll('.bg-white').forEach(el => {
            el.classList.remove('bg-white');
            el.classList.add('bg-gray-800');
        });
        
        // Update all light gray background elements to gray-700
        document.querySelectorAll('.bg-gray-200').forEach(el => {
            el.classList.remove('bg-gray-200');
            el.classList.add('bg-gray-700');
        });
        
        // Update text colors
        document.querySelectorAll('.text-gray-800').forEach(el => {
            el.classList.remove('text-gray-800');
            el.classList.add('text-gray-300');
        });
        
        // Update borders
        document.querySelectorAll('.border-gray-300').forEach(el => {
            el.classList.remove('border-gray-300');
            el.classList.add('border-gray-600');
        });
        
        // Update the header text color
        const headerTitle = document.querySelector('h1');
        if (headerTitle) {
            headerTitle.classList.remove('text-indigo-600');
            headerTitle.classList.add('text-indigo-400');
        }
    }
});
