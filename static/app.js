// Global State
let allReleases = [];
let selectedUpdateId = null;
let currentFilterType = 'all';
let currentSearchQuery = '';

// DOM Elements
const feedTimeline = document.getElementById('feed-timeline');
const feedLoading = document.getElementById('feed-loading');
const feedEmpty = document.getElementById('feed-empty');
const daysCountEl = document.getElementById('days-count');
const updatesCountEl = document.getElementById('updates-count');
const searchInput = document.getElementById('search-input');
const filterTags = document.querySelectorAll('.filter-tag');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const refreshText = document.getElementById('refresh-text');
const lastUpdatedTimeEl = document.getElementById('last-updated-time');
const tweetPanel = document.getElementById('tweet-panel');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const publishTweetBtn = document.getElementById('publish-tweet-btn');
const closeTweetPanelBtn = document.getElementById('close-tweet-panel');
const emptyResetBtn = document.getElementById('empty-reset-btn');
const toastNotification = document.getElementById('toast-notification');
const toastMessageEl = document.getElementById('toast-message');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Search input changes
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().strip();
        renderTimeline();
    });

    // Filter type tags
    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentFilterType = tag.getAttribute('data-type');
            renderTimeline();
        });
    });

    // Refresh button
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Tweet panel close
    closeTweetPanelBtn.addEventListener('click', deselectUpdate);

    // Copy Tweet button
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);

    // Publish Tweet button
    publishTweetBtn.addEventListener('click', publishTweet);

    // Reset filters inside empty state
    emptyResetBtn.addEventListener('click', resetFilters);
}

// Helper to strip whitespace
String.prototype.strip = function() {
    return this.trim().replace(/\s+/g, ' ');
};

// Fetch data from API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    deselectUpdate();
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        
        const data = await response.json();
        allReleases = data.releases || [];
        
        // Update stats
        updateStats();
        
        // Render
        renderTimeline();
        
        // Update last updated timestamp
        const now = new Date();
        lastUpdatedTimeEl.textContent = `Feed synced: ${now.toLocaleTimeString()}`;
        
    } catch (error) {
        console.error("Error fetching release notes:", error);
        lastUpdatedTimeEl.textContent = "Feed sync failed";
        showToast("Error updating feed. Please try again.", true);
        
        if (allReleases.length === 0) {
            feedTimeline.innerHTML = `<div class="card-body" style="text-align: center; color: var(--clr-deprecated); padding: 2rem;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Failed to load BigQuery release notes.</p>
                <p style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.5rem;">${error.message}</p>
            </div>`;
        }
    } finally {
        showLoading(false);
    }
}

// Update Header Stats
function updateStats() {
    daysCountEl.textContent = allReleases.length;
    let totalUpdates = 0;
    allReleases.forEach(rel => {
        totalUpdates += rel.updates ? rel.updates.length : 0;
    });
    updatesCountEl.textContent = totalUpdates;
}

// Show/Hide Loading States
function showLoading(isLoading) {
    if (isLoading) {
        feedLoading.classList.remove('hidden');
        feedTimeline.classList.add('hidden');
        feedEmpty.classList.add('hidden');
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        refreshText.textContent = "Syncing...";
    } else {
        feedLoading.classList.add('hidden');
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
        refreshText.textContent = "Refresh Feed";
    }
}

// Reset Filters
function resetFilters() {
    searchInput.value = '';
    currentSearchQuery = '';
    currentFilterType = 'all';
    
    filterTags.forEach(t => t.classList.remove('active'));
    filterTags[0].classList.add('active'); // 'All' button
    
    renderTimeline();
}

// Get Selected Update Object
function getSelectedUpdate() {
    if (!selectedUpdateId) return null;
    
    for (const rel of allReleases) {
        for (const up of rel.updates) {
            if (up.id === selectedUpdateId) {
                return {
                    date: rel.date,
                    ...up
                };
            }
        }
    }
    return null;
}

// Render Timeline Content based on search & filters
function renderTimeline() {
    feedTimeline.innerHTML = '';
    let renderedCount = 0;

    allReleases.forEach(release => {
        // Filter updates inside the release date
        const filteredUpdates = release.updates.filter(up => {
            // Filter by type
            const matchesType = currentFilterType === 'all' || up.type.toLowerCase() === currentFilterType;
            
            // Filter by search query (check body html or plain text)
            const matchesSearch = currentSearchQuery === '' || 
                up.plain_text.toLowerCase().includes(currentSearchQuery) || 
                up.type.toLowerCase().includes(currentSearchQuery) || 
                release.date.toLowerCase().includes(currentSearchQuery);
                
            return matchesType && matchesSearch;
        });

        // Only render the date group if there's at least one update matching
        if (filteredUpdates.length > 0) {
            renderedCount += filteredUpdates.length;
            
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            // Header for the date
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            
            const dateTitle = document.createElement('h3');
            dateTitle.textContent = release.date;
            
            const extLink = document.createElement('a');
            extLink.className = 'external-link';
            extLink.href = release.link;
            extLink.target = '_blank';
            extLink.title = 'View Official Release Notes';
            extLink.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i>';
            
            dateHeader.appendChild(dateTitle);
            dateHeader.appendChild(extLink);
            dateGroup.appendChild(dateHeader);
            
            // Updates list container
            const updatesList = document.createElement('div');
            updatesList.className = 'updates-list';
            
            filteredUpdates.forEach(up => {
                const card = document.createElement('div');
                card.className = 'update-card';
                card.setAttribute('data-id', up.id);
                card.setAttribute('data-type-lower', up.type.toLowerCase());
                
                if (selectedUpdateId === up.id) {
                    card.classList.add('selected');
                }
                
                // Top row: Type Tag & Quick Action
                const cardTop = document.createElement('div');
                cardTop.className = 'card-top';
                
                const typeBadge = document.createElement('span');
                typeBadge.className = `type-badge ${up.type.toLowerCase()}`;
                typeBadge.textContent = up.type;
                
                const cardActions = document.createElement('div');
                cardActions.className = 'card-actions';
                
                // Direct Tweet button
                const tweetBtn = document.createElement('button');
                tweetBtn.className = 'card-btn';
                tweetBtn.title = 'Quick Share on X';
                tweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i>';
                tweetBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Don't trigger card selection
                    shareDirectTweet(up.tweet_text);
                });
                
                // Direct Copy button
                const copyBtn = document.createElement('button');
                copyBtn.className = 'card-btn';
                copyBtn.title = 'Copy Plain Text';
                copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyTextToClipboard(up.plain_text);
                });
                
                cardActions.appendChild(copyBtn);
                cardActions.appendChild(tweetBtn);
                
                cardTop.appendChild(typeBadge);
                cardTop.appendChild(cardActions);
                card.appendChild(cardTop);
                
                // Body row: HTML Content
                const cardBody = document.createElement('div');
                cardBody.className = 'card-body';
                cardBody.innerHTML = up.body;
                card.appendChild(cardBody);
                
                // Click handler to select card
                card.addEventListener('click', () => {
                    selectUpdate(up.id);
                });
                
                updatesList.appendChild(card);
            });
            
            dateGroup.appendChild(updatesList);
            feedTimeline.appendChild(dateGroup);
        }
    });

    // Check if timeline is empty
    if (renderedCount === 0) {
        feedTimeline.classList.add('hidden');
        feedEmpty.classList.remove('hidden');
    } else {
        feedTimeline.classList.remove('hidden');
        feedEmpty.classList.add('hidden');
    }
}

// Select update
function selectUpdate(id) {
    if (selectedUpdateId === id) {
        deselectUpdate();
        return;
    }
    
    selectedUpdateId = id;
    
    // Highlight active card
    const cards = document.querySelectorAll('.update-card');
    cards.forEach(card => {
        if (card.getAttribute('data-id') === id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Show/populate Tweet preview panel
    const updateObj = getSelectedUpdate();
    if (updateObj) {
        tweetTextarea.value = updateObj.tweet_text;
        charCounter.textContent = `${updateObj.tweet_text.length} / 280`;
        
        if (updateObj.tweet_text.length > 280) {
            charCounter.classList.add('error');
        } else {
            charCounter.classList.remove('error');
        }
        
        tweetPanel.classList.remove('hidden');
        
        // Auto scroll sidebar to the tweet panel on mobile
        if (window.innerWidth <= 1024) {
            tweetPanel.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Deselect update
function deselectUpdate() {
    selectedUpdateId = null;
    const cards = document.querySelectorAll('.update-card');
    cards.forEach(card => card.classList.remove('selected'));
    tweetPanel.classList.add('hidden');
}

// Share Direct Tweet (Quick button)
function shareDirectTweet(text) {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// Publish from Composer
function publishTweet() {
    const text = tweetTextarea.value;
    shareDirectTweet(text);
}

// Copy from Composer
function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    copyTextToClipboard(text, "Tweet text copied to clipboard!");
}

// Clipboard Core Helper
function copyTextToClipboard(text, successMsg = "Copied to clipboard!") {
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
    }).catch(err => {
        console.error("Clipboard copy failed:", err);
        showToast("Failed to copy to clipboard", true);
    });
}

// Toast System
let toastTimeout;
function showToast(message, isError = false) {
    clearTimeout(toastTimeout);
    
    toastMessageEl.textContent = message;
    
    if (isError) {
        toastNotification.style.borderColor = 'var(--clr-deprecated)';
        toastNotification.querySelector('.toast-icon').className = 'fa-solid fa-circle-exclamation';
        toastNotification.querySelector('.toast-icon').style.color = 'var(--clr-deprecated)';
    } else {
        toastNotification.style.borderColor = 'var(--primary)';
        toastNotification.querySelector('.toast-icon').className = 'fa-solid fa-circle-check';
        toastNotification.querySelector('.toast-icon').style.color = 'var(--primary)';
    }
    
    toastNotification.classList.remove('hidden');
    
    toastTimeout = setTimeout(() => {
        toastNotification.classList.add('hidden');
    }, 2500);
}
