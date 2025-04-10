 // DOM elements
 const userCard = document.getElementById('userCard');
 const errorMessage = document.getElementById('errorMessage');
 const userIdInput = document.getElementById('userIdInput');
 const fetchBtn = document.getElementById('fetchBtn');
 const userId = document.getElementById('userId');
 const userAvatar = document.getElementById('userAvatar');
 const userStatus = document.getElementById('userStatus');
 const statusIndicator = document.getElementById('statusIndicator');
 const gameActivity = document.getElementById('gameActivity');
 const gameName = document.getElementById('gameName');
 const spotifyActivity = document.getElementById('spotifyActivity');
 const spotifyArt = document.getElementById('spotifyArt');
 const spotifyTitle = document.getElementById('spotifyTitle');
 const spotifyArtist = document.getElementById('spotifyArtist');
 const spotifyAlbum = document.getElementById('spotifyAlbum');
 const progressFill = document.getElementById('progressFill');
 const currentTime = document.getElementById('currentTime');
 const totalTime = document.getElementById('totalTime');

 // Hardcoded API URL
 const API_URL = "https://api.spies.rest";

 // Variables for Spotify playback tracking
 let progressInterval;
 let totalDuration = 0;
 let lastApiTimestamp = 0;
 let lastApiProgress = 0;
 let currentTrackTitle = "";
 let currentTrackArtist = "";
 let autoUpdateTimer = null;
 let songEndTimer = null;

 function formatTime(seconds) {
     const mins = Math.floor(seconds / 60);
     const secs = Math.floor(seconds % 60);
     return `${mins}:${secs.toString().padStart(2, '0')}`;
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
             displayUserData(data);
             
             // Set up regular polling for song changes
             setupAutoSongCheck();
         })
         .catch(error => {
             console.error('Error fetching user data:', error);
             showError(`Failed to fetch user data: ${error.message}`);
         });
 }

 function setupAutoSongCheck() {
     // Clear existing timer
     if (autoUpdateTimer) {
         clearTimeout(autoUpdateTimer);
     }
     
     // Set up a new timer to check for song changes
     autoUpdateTimer = setTimeout(() => {
         checkForSongChange();
     }, 15000); // Check every 15 seconds
 }

 function checkForSongChange() {
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
             // Check if there's a song change or activity change
             const hasSpotifyActivity = data.activity && data.activity.type === "Spotify";
             
             if (hasSpotifyActivity) {
                 const newTrackTitle = data.activity.track;
                 const newTrackArtist = data.activity.artist;
                 
                 // If song changed, update the display
                 if (newTrackTitle !== currentTrackTitle || newTrackArtist !== currentTrackArtist) {
                     console.log("Song changed! Updating display...");
                     displayUserData(data);
                 } else {
                     // Only update the progress if it's the same song
                     updateSpotifyProgress(data.activity);
                 }
             } else if (currentTrackTitle) {
                 // Had a song before, but not anymore - update display
                 displayUserData(data);
             }
             
             // Set up next check
             setupAutoSongCheck();
         })
         .catch(error => {
             console.error('Error checking for song change:', error);
             // Try again later even on error
             setupAutoSongCheck();
         });
 }

 function updateSpotifyProgress(activity) {
     // Update progress tracking variables
     lastApiProgress = activity.progress || 0;
     lastApiTimestamp = activity.timestamp || (Date.now() / 1000);
     totalDuration = activity.duration || 0;
     
     // Update time displays
     currentTime.textContent = formatTime(lastApiProgress);
     
     // Set progress bar
     const progressPercent = (lastApiProgress / totalDuration) * 100;
     progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
 }

 function displayUserData(data) {
     // Clear any existing intervals and timers
     if (progressInterval) {
         clearInterval(progressInterval);
     }
     if (songEndTimer) {
         clearTimeout(songEndTimer);
         songEndTimer = null;
     }
     
     // Reset visibility
     errorMessage.style.display = 'none';
     userCard.classList.remove('hidden');
     gameActivity.classList.add('hidden');
     spotifyActivity.classList.add('hidden');
     
     // Display user info
     userId.textContent = data.username ? data.username : `User ${data.user_id}`;
     userStatus.textContent = data.status;
     
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
     
     // Clear track info
     currentTrackTitle = "";
     currentTrackArtist = "";
     
     // Handle activity display
     if (data.activity) {
         if (typeof data.activity === 'string' && data.activity.startsWith('Playing')) {
             // Game activity
             gameActivity.classList.remove('hidden');
             gameName.textContent = data.activity.replace('Playing ', '');
         } else if (data.activity && data.activity.type === 'Spotify') {
             // Spotify activity
             spotifyActivity.classList.remove('hidden');
             
             // Update current track info for change detection
             currentTrackTitle = data.activity.track;
             currentTrackArtist = data.activity.artist;
             
             spotifyTitle.textContent = currentTrackTitle;
             spotifyArtist.textContent = currentTrackArtist;
             spotifyAlbum.textContent = data.activity.album;
             
             if (data.activity.image_url) {
                 spotifyArt.src = data.activity.image_url;
             } else {
                 spotifyArt.src = '/api/placeholder/64/64';
             }
             
             // Get timestamps and calculate start time
             totalDuration = data.activity.duration || 0;
             lastApiProgress = data.activity.progress || 0;
             lastApiTimestamp = data.activity.timestamp || (Date.now() / 1000);
             
             // Update time displays
             currentTime.textContent = formatTime(lastApiProgress);
             totalTime.textContent = formatTime(totalDuration);
             
             // Set initial progress
             const progressPercent = (lastApiProgress / totalDuration) * 100;
             progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
             
             // Start progress interval - update more frequently for smoother animation
             progressInterval = setInterval(updateProgress, 250);
         }
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