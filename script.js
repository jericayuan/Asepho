const CLIENT_ID = '611205864690-l8enoqmsp9hesbo0jp65lo5nrhcftq8m.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDGf9fJwnRHqrFWfdGWCxlbvt1ehkLJzyY';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

let tokenClient;
let accessToken = null;
let calendar; // Variable to store the FullCalendar instance

document.getElementById('authorize_button').addEventListener('click', () => {
    if (!tokenClient) {
        console.error('Token client not initialized.');
        return;
    }
    tokenClient.requestAccessToken();
});

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
            // Refetch events after authorization
            calendar.refetchEvents();
        },
    });
}

function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth',
        },
        events: async function (fetchInfo, successCallback, failureCallback) {
            if (!accessToken) {
                console.log('User not authorized yet. Displaying an empty calendar.');
                successCallback([]); // Return an empty array if not authorized
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
                }));
                successCallback(events);
            } catch (error) {
                console.error('Error fetching events:', error);
                failureCallback(error);
            }
        },
    });

    calendar.render();
}

document.querySelectorAll('.dropdown-button').forEach(button => {
    button.addEventListener('click', () => {
        const dropdownContent = button.nextElementSibling;
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });
});

window.onload = gapiLoad;
