// DOM elements
const userCard = document.getElementById('userCard');
const errorMessage = document.getElementById('errorMessage');
const userIdInput = document.getElementById('userIdInput');
const fetchBtn = document.getElementById('fetchBtn');
const userId = document.getElementById('userId');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const userStatus = document.getElementById('userStatus');
const statusIndicator = document.getElementById('statusIndicator');

// Custom status elements
const customStatus = document.getElementById('customStatus');
const customStatusEmoji = document.getElementById('customStatusEmoji');
const customStatusText = document.getElementById('customStatusText');

// Game activity elements
const gameActivity = document.getElementById('gameActivity');
const gameIcon = document.getElementById('gameIcon');
const gameName = document.getElementById('gameName');
const gameDetails = document.getElementById('gameDetails');
const gameState = document.getElementById('gameState');
const gameDuration = document.getElementById('gameDuration');

// Spotify activity elements
const spotifyActivity = document.getElementById('spotifyActivity');
const spotifyArt = document.getElementById('spotifyArt');
const spotifyTitle = document.getElementById('spotifyTitle');
const spotifyArtist = document.getElementById('spotifyArtist');
const spotifyAlbum = document.getElementById('spotifyAlbum');
const progressFill = document.getElementById('progressFill');
const currentTime = document.getElementById('currentTime');
const totalTime = document.getElementById('totalTime');
const spotifyBtn = document.getElementById('spotifyBtn');

// Streaming activity elements
const streamActivity = document.getElementById('streamActivity');
const streamType = document.getElementById('streamType');
const streamIcon = document.getElementById('streamIcon');
const streamTitle = document.getElementById('streamTitle');
const streamChannel = document.getElementById('streamChannel');
const streamDuration = document.getElementById('streamDuration');
const streamElapsed = document.getElementById('streamElapsed');
const watchBtn = document.getElementById('watchBtn');
const channelBtn = document.getElementById('channelBtn');

// Hardcoded API URL
const API_URL = "https://api.spies.rest";

// Variables for activity tracking
let progressInterval;
let gameUpdateInterval;
let streamUpdateInterval;
let totalDuration = 0;
let lastApiTimestamp = 0;
let lastApiProgress = 0;
let gameStartTime = 0;
let streamStartTime = 0;
let currentTrackTitle = "";
let currentTrackArtist = "";
let currentGameName = "";
let currentStreamTitle = "";
let autoUpdateTimer = null;
let songEndTimer = null;
let spotifyUrl = "";
let streamUrl = "";
let channelUrl = "";

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds) {
    if (seconds < 3600) {
        // Less than an hour, just show minutes:seconds
        return formatTime(seconds);
    } else {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
}

function updateProgress() {
    if (!lastApiTimestamp) return;
    
    // Calculate how much time has passed since we got the API data
    const now = Date.now() / 1000; // Current time in seconds
    const timePassedSinceUpdate = now - lastApiTimestamp;
    
    // Current position = progress reported by API + time passed since API update
    const currentPosition = lastApiProgress + timePassedSinceUpdate;
    
    if (currentPosition >= totalDuration) {
        // Song should be finished - auto refresh to check for a new song
        clearInterval(progressInterval);
        progressInterval = null;
        progressFill.style.width = '100%';
        currentTime.textContent = formatTime(totalDuration);
        
        // Schedule a refresh shortly after the song should have ended
        if (!songEndTimer) {
            songEndTimer = setTimeout(() => {
                fetchUserData();
                songEndTimer = null;
            }, 2000); // Wait 2 seconds after song end to refresh
        }
        return;
    }
    
    // Update progress bar
    const progressPercent = (currentPosition / totalDuration) * 100;
    progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
    currentTime.textContent = formatTime(currentPosition);
}

function updateGameDuration() {
    if (!gameStartTime) return;
    
    const now = Date.now() / 1000; // Current time in seconds
    const elapsedSeconds = now - gameStartTime;
    
    // Format the duration
    const durationSpan = gameDuration.querySelector('span');
    if (durationSpan) {
        durationSpan.textContent = formatDuration(elapsedSeconds);
    }
}

function updateStreamDuration() {
    if (!streamStartTime) return;
    
    const now = Date.now() / 1000; // Current time in seconds
    const elapsedSeconds = now - streamStartTime;
    
    // Format the duration
    streamElapsed.textContent = formatDuration(elapsedSeconds);
}

// Fetch user data from API
function fetchUserData() {
    const inputId = userIdInput.value.trim();
    
    // Save value to localStorage
    localStorage.setItem('userId', inputId);
    
    // Validate user ID
    if (!inputId || isNaN(inputId)) {
        showError("Please enter a valid Discord User ID");
        return;
    }
    
    // Using the hardcoded API URL
    const fullUrl = `${API_URL}/user/status/${inputId}`;
    
    // Display loading state only on first load
    if (userCard.classList.contains('hidden')) {
        showError("Fetching user data...");
    }
    
    fetch(fullUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if the response is valid
            if (!data) {
                throw new Error("Invalid response data");
            }
            
            // Log the data for debugging
            console.log("API Response:", data);
            
            displayUserData(data);
            
            // Set up regular polling for activity changes
            setupAutoActivityCheck();
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            showError(`Failed to fetch user data: ${error.message}`);
        });
}

function setupAutoActivityCheck() {
    // Clear existing timer
    if (autoUpdateTimer) {
        clearTimeout(autoUpdateTimer);
        autoUpdateTimer = null;
    }
    
    // Set up a new timer to check for activity changes
    autoUpdateTimer = setTimeout(() => {
        checkForActivityChanges();
    }, 15000); // Check every 15 seconds
}

function checkForActivityChanges() {
    const inputId = userIdInput.value.trim();
    
    if (!inputId) return;
    
    const fullUrl = `${API_URL}/user/status/${inputId}`;
    
    fetch(fullUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if there's any activity change
            const activityChanged = checkIfActivityChanged(data);
            
            if (activityChanged) {
                console.log("Activity changed! Updating display...");
                displayUserData(data);
            } else {
                // Only update the progress if activities are the same
                updateActivityProgress(data.activity);
            }
            
            // Set up next check
            setupAutoActivityCheck();
        })
        .catch(error => {
            console.error('Error checking for activity changes:', error);
            // Try again later even on error
            setupAutoActivityCheck();
        });
}

function checkIfActivityChanged(data) {
    // First, handle the case where there's no activity at all
    if (!data.activity) {
        return currentTrackTitle || currentGameName || currentStreamTitle;
    }
    
    // Variables to track activity changes
    let spotifyChanged = false;
    let gameChanged = false;
    let streamChanged = false;
    let hasSpotify = false;
    let hasGame = false;
    let hasStream = false;
    
    // Process activity data
    if (Array.isArray(data.activity)) {
        // Process an array of activities
        for (const activity of data.activity) {
            checkSingleActivity(activity);
        }
    } else if (typeof data.activity === 'object') {
        // Process a single activity object, but check for multiple types
        checkSingleActivity(data.activity);
    }
    
    // Helper function to check a single activity
    function checkSingleActivity(activity) {
        if (!activity) return;
        
        // Check for Spotify
        if (activity.type === "Spotify") {
            hasSpotify = true;
            spotifyChanged = activity.track !== currentTrackTitle || 
                           activity.artist !== currentTrackArtist;
        }
        
        // Check for games with broader criteria
        if (activity.type === "Playing" || 
            activity.type === "PLAYING" ||
            (activity.name && activity.type !== "Spotify" && 
             activity.type !== "Streaming" && 
             activity.type !== "Watching" && 
             activity.type !== "Listening") || 
            activity.application_id) {
            hasGame = true;
            gameChanged = activity.name !== currentGameName;
        }
        
        // Check for streaming
        if (activity.type === "Streaming" || 
            activity.type === "Watching" || 
            (activity.type === "Listening" && activity.type !== "Spotify")) {
            hasStream = true;
            const streamTitle = activity.details || activity.name || "";
            streamChanged = streamTitle !== currentStreamTitle;
        }
    }
    
    // Check for activities in nested properties (if the API formats it this way)
    if (data.activities && Array.isArray(data.activities)) {
        for (const activity of data.activities) {
            checkSingleActivity(activity);
        }
    }
    
    // Check for activities that have disappeared
    const spotifyDisappeared = currentTrackTitle && !hasSpotify;
    const gameDisappeared = currentGameName && !hasGame;
    const streamDisappeared = currentStreamTitle && !hasStream;
    
    // Return true if any activity has changed or disappeared
    return spotifyChanged || gameChanged || streamChanged || 
           spotifyDisappeared || gameDisappeared || streamDisappeared;
}

function updateActivityProgress(activity) {
    // Handle different activity formats
    if (Array.isArray(activity)) {
        // If it's an array, check each activity
        for (const singleActivity of activity) {
            updateSingleActivityProgress(singleActivity);
        }
    } else if (typeof activity === 'object') {
        // If it's a single object, update it
        updateSingleActivityProgress(activity);
    }
    
    // Helper function to update a single activity
    function updateSingleActivityProgress(singleActivity) {
        if (!singleActivity) return;
        
        if (singleActivity.type === "Spotify") {
            // Update Spotify progress
            lastApiProgress = singleActivity.progress || 0;
            lastApiTimestamp = singleActivity.timestamp || (Date.now() / 1000);
            totalDuration = singleActivity.duration || 0;
            updateProgress();
        }
        // Game and streaming activities don't need progress updates as we calculate in real-time
    }
    
    // Check for activities in nested properties (if the API formats it this way)
    if (activity && activity.activities && Array.isArray(activity.activities)) {
        for (const singleActivity of activity.activities) {
            updateSingleActivityProgress(singleActivity);
        }
    }
}

function displayUserData(data) {
    // Clear any existing intervals and timers
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    if (gameUpdateInterval) {
        clearInterval(gameUpdateInterval);
        gameUpdateInterval = null;
    }
    if (streamUpdateInterval) {
        clearInterval(streamUpdateInterval);
        streamUpdateInterval = null;
    }
    if (songEndTimer) {
        clearTimeout(songEndTimer);
        songEndTimer = null;
    }
    
    // Reset visibility of all activity cards
    errorMessage.style.display = 'none';
    userCard.classList.remove('hidden');
    customStatus.classList.add('hidden');
    gameActivity.classList.add('hidden');
    spotifyActivity.classList.add('hidden');
    streamActivity.classList.add('hidden');
    
    // Clear current activity tracking variables
    currentTrackTitle = "";
    currentTrackArtist = "";
    currentGameName = "";
    currentStreamTitle = "";
    gameStartTime = 0;
    streamStartTime = 0;
    spotifyUrl = "";
    streamUrl = "";
    channelUrl = "";
    
    // Display user info
    userId.textContent = data.display_name || data.username || `User ${data.user_id}`;
    userName.textContent = '@' + (data.username || `User ${data.user_id}`);
    userStatus.textContent = data.status || "unknown";
    
    // Set avatar if available
    if (data.avatar_url) {
        userAvatar.src = data.avatar_url;
    } else {
        userAvatar.src = '/api/placeholder/80/80';
    }
    
    // Set status indicator color
    statusIndicator.className = 'status-indicator';
    if (data.status === 'online') {
        statusIndicator.classList.add('status-online');
    } else if (data.status === 'idle') {
        statusIndicator.classList.add('status-idle');
    } else if (data.status === 'dnd') {
        statusIndicator.classList.add('status-dnd');
    }
    
    // Handle custom status
    if (data.custom_status) {
        customStatus.classList.remove('hidden');
        customStatusText.textContent = data.custom_status.text || '';
        customStatusEmoji.textContent = data.custom_status.emoji || '';
    }
    
    // Handle activity display
    if (data.activity) {
        // Check if there are multiple activities
        if (Array.isArray(data.activity)) {
            // If we have an array of activities, process each one
            data.activity.forEach(activity => {
                displaySingleActivity(activity);
            });
        } else if (typeof data.activity === 'object') {
            // If we have a single activity object, check for different types independently
            const activity = data.activity;
            
            // Check for each activity type independently
            // This allows multiple activity types to be displayed simultaneously
            
            // Check for Spotify activity
            if (activity.type === 'Spotify') {
                displaySpotifyActivity(activity);
            }
            
            // Check for game activity with expanded criteria
            if (activity.type === 'Playing' || 
                activity.type === 'PLAYING' ||
                (activity.name && !activity.type) || 
                activity.application_id || 
                (activity.name && activity.type !== 'Spotify' && 
                 activity.type !== 'Streaming' && 
                 activity.type !== 'Watching' && 
                 activity.type !== 'Listening')) {
                console.log("Displaying game activity:", activity);
                displayGameActivity(activity);
            }
            
            // Check for streaming activity
            if (activity.type === 'Streaming' || 
                activity.type === 'Watching' || 
                (activity.type === 'Listening' && activity.type !== 'Spotify')) {
                displayStreamActivity(activity);
            }
        } else if (typeof data.activity === 'string' && data.activity.startsWith('Playing')) {
            // Handle legacy string-based activity
            displayLegacyGameActivity(data.activity);
        }
        
        // Check for multiple activities in nested properties (if the API formats it this way)
        if (data.activities && Array.isArray(data.activities)) {
            data.activities.forEach(activity => {
                displaySingleActivity(activity);
            });
        }
    }
}

// Helper function to route a single activity to the right display function
function displaySingleActivity(activity) {
    if (!activity) return;
    
    // Determine activity type and display the appropriate card
    if (activity.type === 'Spotify') {
        displaySpotifyActivity(activity);
    } else if (activity.type === 'Playing' || 
              activity.type === 'PLAYING' ||
              (activity.name && !activity.type) || 
              activity.application_id || 
              (activity.name && activity.type !== 'Spotify' && 
               activity.type !== 'Streaming' && 
               activity.type !== 'Watching' && 
               activity.type !== 'Listening')) {
        console.log("Displaying game activity from array:", activity);
        displayGameActivity(activity);
    } else if (activity.type === 'Streaming' || 
              activity.type === 'Watching' || 
              (activity.type === 'Listening' && activity.type !== 'Spotify')) {
        displayStreamActivity(activity);
    } else if (typeof activity === 'string' && activity.startsWith('Playing')) {
        displayLegacyGameActivity(activity);
    }
}

function displaySpotifyActivity(activity) {
    // Safety check
    if (!activity || !activity.track) {
        console.error("Invalid Spotify activity data", activity);
        return;
    }
    
    spotifyActivity.classList.remove('hidden');
    
    // Update current track info for change detection
    currentTrackTitle = activity.track;
    currentTrackArtist = activity.artist || '';
    
    // Update the album and artist information
    spotifyArtist.textContent = currentTrackArtist;
    spotifyAlbum.textContent = activity.album || '';
    
    // Generate Spotify URL if not provided (optional)
    if (!activity.url && activity.track_id) {
        activity.url = `https://open.spotify.com/track/${activity.track_id}`;
    } else if (!activity.url && activity.track && activity.artist) {
        // Fallback for when you don't have track ID - opens a search
        const searchQuery = encodeURIComponent(`${activity.track} ${activity.artist}`);
        activity.url = `https://open.spotify.com/search/${searchQuery}`;
    }
    
    // Set Spotify URL for the button if available
    if (activity.url) {
        spotifyUrl = activity.url;
        spotifyBtn.onclick = () => window.open(spotifyUrl, '_blank');
        spotifyBtn.classList.remove('hidden');
    } else {
        spotifyBtn.classList.add('hidden');
    }
    
    // Handle the title with scrolling marquee if needed
    // First, clear any existing content
    spotifyTitle.innerHTML = '';
    
    // Get a clean container to measure the width
    spotifyTitle.textContent = currentTrackTitle;
    
    // Check if the title is long and needs to scroll
    const titleWidth = spotifyTitle.scrollWidth;
    const containerWidth = spotifyTitle.clientWidth;
    
    // If content is wider than container, create a marquee effect
    if (titleWidth > containerWidth) {
        // Clear the regular title
        spotifyTitle.textContent = '';
        
        // Create the marquee structure
        const marqueeContainer = document.createElement('div');
        marqueeContainer.className = 'spotify-title-marquee';
        
        const marqueeContent = document.createElement('div');
        marqueeContent.className = 'marquee-content';
        
        // Create multiple copies of the title to ensure smooth looping
        // We need at least 2 copies of the text to create the infinite loop effect
        for (let i = 0; i < 4; i++) {
            const titleItem = document.createElement('div');
            titleItem.className = 'title-item';
            titleItem.textContent = currentTrackTitle;
            marqueeContent.appendChild(titleItem);
        }
        
        // Adjust scrolling speed based on text length
        const textLength = currentTrackTitle.length;
        const duration = Math.max(8, Math.min(25, 10 + textLength * 0.3));
        marqueeContent.style.animationDuration = `${duration}s`;
        
        // Add the elements to the DOM
        marqueeContainer.appendChild(marqueeContent);
        spotifyTitle.appendChild(marqueeContainer);
    } else {
        // For short titles, just show the text
        spotifyTitle.textContent = currentTrackTitle;
    }
    
    if (activity.image_url) {
        spotifyArt.src = activity.image_url;
    } else {
        spotifyArt.src = '/api/placeholder/64/64';
    }
    
    // Get timestamps and calculate start time
    totalDuration = activity.duration || 0;
    lastApiProgress = activity.progress || 0;
    lastApiTimestamp = activity.timestamp || (Date.now() / 1000);
    
    // Update time displays
    currentTime.textContent = formatTime(lastApiProgress);
    totalTime.textContent = formatTime(totalDuration);
    
    // Set initial progress
    const progressPercent = (lastApiProgress / totalDuration) * 100;
    progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
    
    // Start progress interval - update more frequently for smoother animation
    progressInterval = setInterval(updateProgress, 250);
}

function displayGameActivity(activity) {
    // Safety check
    if (!activity || !activity.name) {
        console.error("Invalid game activity data", activity);
        return;
    }
    
    console.log("Game activity being displayed:", activity);
    gameActivity.classList.remove('hidden');
    
    // Update current game for change detection
    currentGameName = activity.name || '';
    
    // Set game name
    gameName.textContent = currentGameName;
    
    // Set game icon if available
    if (activity.image_url) {
        gameIcon.src = activity.image_url;
    } else {
        gameIcon.src = '/api/placeholder/64/64';
    }
    
    // Set game details if available
    if (activity.details) {
        gameDetails.textContent = activity.details;
        gameDetails.classList.remove('hidden');
    } else {
        gameDetails.classList.add('hidden');
    }
    
    // Set game state if available
    if (activity.state) {
        gameState.textContent = activity.state;
        gameState.classList.remove('hidden');
    } else {
        gameState.classList.add('hidden');
    }
    
    // Set game duration if timestamp available
    if (activity.timestamp) {
        gameStartTime = activity.timestamp;
        gameDuration.classList.remove('hidden');
        
        // Initial update
        updateGameDuration();
        
        // Start interval for updating duration
        gameUpdateInterval = setInterval(updateGameDuration, 60000); // Update every minute
    } else {
        gameDuration.classList.add('hidden');
    }
}

function displayLegacyGameActivity(activityString) {
    if (!activityString) return;
    
    console.log("Legacy game activity being displayed:", activityString);
    gameActivity.classList.remove('hidden');
    
    // Extract the game name
    const gameTitleStr = activityString.replace('Playing ', '');
    
    // Update tracking
    currentGameName = gameTitleStr;
    
    // Set game name
    gameName.textContent = gameTitleStr;
    
    // Hide optional elements
    gameDetails.classList.add('hidden');
    gameState.classList.add('hidden');
    gameDuration.classList.add('hidden');
}

function displayStreamActivity(activity) {
    // Safety check
    if (!activity) {
        console.error("Invalid stream activity data", activity);
        return;
    }
    
    streamActivity.classList.remove('hidden');
    
    // Set activity type
    const activityTypeText = activity.type ? activity.type.toUpperCase() : 'WATCHING';
    const appName = activity.application || '';
    streamType.textContent = `${activityTypeText} ${appName}`.trim();
    
    // Update current stream title for change detection
    currentStreamTitle = activity.details || activity.name || '';
    
    // Set stream title
    streamTitle.textContent = currentStreamTitle;
    
    // Set channel/creator name if available
    if (activity.state) {
        streamChannel.textContent = activity.state;
        streamChannel.classList.remove('hidden');
    } else {
        streamChannel.classList.add('hidden');
    }
    
    // Set stream thumbnail if available
    if (activity.image_url) {
        streamIcon.src = activity.image_url;
    } else {
        streamIcon.src = '/api/placeholder/64/64';
    }
    
    // Set URLs for buttons if available
    if (activity.url) {
        streamUrl = activity.url;
        watchBtn.onclick = () => window.open(streamUrl, '_blank');
        watchBtn.classList.remove('hidden');
    } else {
        watchBtn.classList.add('hidden');
    }
    
    if (activity.channel_url) {
        channelUrl = activity.channel_url;
        channelBtn.onclick = () => window.open(channelUrl, '_blank');
        channelBtn.classList.remove('hidden');
    } else {
        channelBtn.classList.add('hidden');
    }
    
    // Set stream duration if timestamp available
    if (activity.timestamp) {
        streamStartTime = activity.timestamp;
        streamDuration.classList.remove('hidden');
        
        // Initial update
        updateStreamDuration();
        
        // Start interval for updating duration
        streamUpdateInterval = setInterval(updateStreamDuration, 60000); // Update every minute
    } else {
        streamDuration.classList.add('hidden');
    }
}

function showError(message) {
    userCard.classList.add('hidden');
    errorMessage.innerHTML = message;
    errorMessage.style.display = 'block';
}

// Load saved settings from localStorage
function loadSavedSettings() {
    const savedUserId = localStorage.getItem('userId');
    
    if (savedUserId) {
        userIdInput.value = savedUserId;
        // Auto-fetch if we have a saved user ID
        fetchUserData();
    }
}

// Event listeners
fetchBtn.addEventListener('click', fetchUserData);
userIdInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        fetchUserData();
    }
});

// Initialize
showError("Enter a Discord User ID to fetch status");
loadSavedSettings(); // Load any saved settings