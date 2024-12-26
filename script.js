const CLIENT_ID = '611205864690-l8enoqmsp9hesbo0jp65lo5nrhcftq8m.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDGf9fJwnRHqrFWfdGWCxlbvt1ehkLJzyY';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

let tokenClient;
let accessToken = null;
let calendar; // Variable to store the FullCalendar instance

// Initializes client with user tokens
document.getElementById('authorize_button').addEventListener('click', () => {
    if (!tokenClient) {
        console.error('Token client not initialized.');
        return;
    }
    tokenClient.requestAccessToken();
});

// Signs out
document.getElementById('signout_button').addEventListener('click', () => {
    accessToken = null;
    document.getElementById('authorize_button').style.display = 'block';
    document.getElementById('signout_button').style.display = 'none';
    calendar.refetchEvents(); // Refresh calendar to show empty
});


// initilizes Gapi client
function gapiLoad() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
    });
    console.log('Google API client initialized.');
    gisSetup();
    initializeCalendar(); // Initialize the calendar immediately
}

function gisSetup() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse.error) {
                console.error('Error obtaining access token:', tokenResponse.error);
                return;
            }
            accessToken = tokenResponse.access_token;
            console.log('Access token obtained:', accessToken);
            document.getElementById('authorize_button').style.display = 'none';
            document.getElementById('signout_button').style.display = 'block';
            // Refetch events after authorization
            calendar.refetchEvents();
        },
    });
}

function openEventModal(event) {
    console.log('openEventModal called with event:', event); // Debug log

    const modal = document.getElementById('eventModal');
    const title = document.getElementById('event-title');
    const time = document.getElementById('event-time');
    const description = document.getElementById('event-description');
    const location = document.getElementById('event-location');

    // Debug logs for modal elements
    console.log('Modal elements:', { modal, title, time, description, location });

    // Populate modal with event details
    title.textContent = event.title;
    time.textContent = `Start: ${event.start.toLocaleString()} - End: ${event.end ? event.end.toLocaleString() : 'N/A'}`;
    description.textContent = `Description: ${event.extendedProps.description}`;
    location.textContent = `Location: ${event.extendedProps.location}`;

    // Show the modal
    modal.style.display = 'block';
}

// Close the modal when clicking the close button or outside the modal
document.querySelector('.close-button').addEventListener('click', () => {
    document.getElementById('eventModal').style.display = 'none';
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('eventModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});


// initializes calendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth',
        },
        buttonText: {
            today: 'Today',
            dayGridMonth: 'Month',
            timeGridWeek: 'Week',
            timeGridDay: 'Day',
        },
        events: async function (fetchInfo, successCallback, failureCallback) {
            if (!accessToken) {
                console.log('User not authorized yet. Displaying an empty calendar.');
                successCallback([]);
                return;
            }

            try {
                const response = await gapi.client.calendar.events.list({
                    calendarId: 'primary',
                    timeMin: fetchInfo.startStr,
                    timeMax: fetchInfo.endStr,
                    singleEvents: true,
                    orderBy: 'startTime',
                });
                const events = response.result.items.map(event => ({
                    title: event.summary,
                    start: event.start.dateTime || event.start.date,
                    end: event.end.dateTime || event.end.date,
                    description: event.description || 'No description available',
                    location: event.location || 'No location provided',
                }));
                successCallback(events);
            } catch (error) {
                console.error('Error fetching events:', error);
                failureCallback(error);
            }
        },
        eventClick: function (info) {
            console.log('Event clicked:', info.event); // Debug log
            // Show overlay or modal with event details
            openEventModal(info.event);
        },
    });

    calendar.render();
}


const searchButton = document.getElementById('search_button');
const searchIcon = searchButton.querySelector('img');
const searchInput = document.getElementById('search_input');
const backButton = document.getElementById('back_button');

// Search Button Click
searchButton.addEventListener('click', () => {
    if (searchIcon.getAttribute('src') === 'icons/search-icon.png') {
        // Perform search
        const query = searchInput.value.trim();
        if (!query) {
            alert('Please enter a search term.');
            return;
        }
        searchCalendarEvents(query);
        // Change icon to back arrow
        searchIcon.setAttribute('src', 'icons/back-arrow.png');
    } else {
        // Back action
        resetSidebar();
    }
});

// Back Button Click
backButton.addEventListener('click', resetSidebar);

// Enter Key in Search Input
searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const query = searchInput.value.trim();
        if (!query) {
            alert('Please enter a search term.');
            return;
        }
        searchCalendarEvents(query);
        searchIcon.setAttribute('src', 'icons/back-arrow.png');
    }
});

// Search Functionality
async function searchCalendarEvents(query) {
    if (!accessToken) {
        alert('Please authorize the app to access your Google Calendar.');
        return;
    }

    try {
        const response = await gapi.client.calendar.events.list({
            calendarId: 'asepho.dev@gmail.com',
            q: query,
            timeMin: '1970-01-01T00:00:00Z',
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.result.items;

        if (events.length === 0) {
            displaySearchResults(`No events found for "${query}".`);
        } else {
            displaySearchResults(events);
        }

        document.getElementById('sidebar_content').style.display = 'none';
        document.getElementById('search_results_view').style.display = 'block';
    } catch (error) {
        console.error('Error searching events:', error);
        displaySearchResults('Error fetching events.');
    }
}

// Display Search Results
function displaySearchResults(results) {
    const resultsDiv = document.getElementById('search_results');
    resultsDiv.innerHTML = '';

    if (typeof results === 'string') {
        resultsDiv.textContent = results;
        return;
    }

    results.forEach((event) => {
        const eventDiv = document.createElement('div');
        eventDiv.innerHTML = `
            <h4>${event.summary || 'No Title'}</h4>
            <p>Start: ${event.start.dateTime || event.start.date}</p>
            <p>End: ${event.end.dateTime || event.end.date}</p>
        `;
        resultsDiv.appendChild(eventDiv);
    });
}

// Reset Sidebar to Original State
function resetSidebar() {
    document.getElementById('sidebar_content').style.display = 'block';
    document.getElementById('search_results_view').style.display = 'none';
    searchIcon.setAttribute('src', 'icons/search-icon.png');
}

document.querySelectorAll('.dropdown-button').forEach(button => {
    button.addEventListener('click', () => {
        const dropdownContent = button.nextElementSibling;
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });
});

window.onload = gapiLoad;

