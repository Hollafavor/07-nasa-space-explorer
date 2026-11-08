// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const searchButton = document.querySelector('.filters button');
const apodModal = document.getElementById('apodModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const closeModalButton = document.getElementById('closeModal');
const nasaApiKey = 'DEMO_KEY';
const spaceFactElement = document.getElementById('spaceFact');
const spaceFacts = [
	'A day on Venus is longer than its year.',
	'Sunlight takes about 8 minutes and 20 seconds to reach Earth.',
	'Saturn is less dense than water, so it would float in a big enough bathtub.',
	'The Moon moves about 3.8 centimeters farther from Earth each year.',
	'Jupiter’s Great Red Spot is a giant storm that has lasted for centuries.'
];

const randomFactIndex = Math.floor(Math.random() * spaceFacts.length);
spaceFactElement.textContent = spaceFacts[randomFactIndex];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

searchButton.addEventListener('click', loadAPOD);
closeModalButton.addEventListener('click', () => apodModal.close());

apodModal.addEventListener('click', (event) => {
	if (event.target === apodModal) {
		apodModal.close();
	}
});

async function loadAPOD() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate) {
		showMessage('Please select both dates.');
		return;
	}

	if (startDate > endDate) {
		showMessage('Start date must be before the end date.');
		return;
	}

	const endpoint = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic/';
	const parameters = new URLSearchParams({
		start_date: startDate,
		end_date: endDate,
		api_key: nasaApiKey
	});

	searchButton.disabled = true;
	searchButton.textContent = 'Loading...';
	showMessage('🔄 Loading space photos…');

	try {
		const entries = await getAPODEntries(endpoint, parameters, startDate, endDate);
		gallery.replaceChildren();

		if (entries.length === 0) {
			showMessage('No space images were found for those dates.');
			return;
		}

		entries.forEach((entry) => {
			gallery.appendChild(createAPODCard(entry));
		});
	} catch (error) {
		showMessage('Unable to load space images. Please try again.');
		console.error('Unable to retrieve APOD:', error);
	} finally {
		searchButton.disabled = false;
		searchButton.textContent = 'Get Space Images';
	}
}

async function getAPODEntries(endpoint, parameters, startDate, endDate) {
	const entries = [];
	let page = 1;

	while (true) {
		parameters.set('page', page);
		const response = await fetch(`${endpoint}?${parameters.toString()}`);

		if (!response.ok) {
			throw new Error(`NASA request failed with status ${response.status}.`);
		}

		const data = await response.json();
		const pageEntries = Array.isArray(data) ? data : [data];

		if (pageEntries.length === 0) {
			break;
		}

		const matchingEntries = pageEntries.filter((entry) => (
			entry.date >= startDate && entry.date <= endDate
		));
		entries.push(...matchingEntries);

		const oldestDate = pageEntries[pageEntries.length - 1].date;
		if (oldestDate <= startDate || pageEntries.length < 25) {
			break;
		}

		page += 1;
	}

	return entries;
}

function createAPODCard(entry) {
	const article = document.createElement('article');
	article.className = 'gallery-item';

	if (entry.media_type === 'image' && (entry.hdurl || entry.url)) {
		article.classList.add('gallery-item-clickable');
		article.tabIndex = 0;
		article.setAttribute('role', 'button');
		article.setAttribute('aria-label', `View details for ${entry.title}`);
		article.addEventListener('click', () => openAPODModal(entry));
		article.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				openAPODModal(entry);
			}
		});

		const image = document.createElement('img');
		image.src = entry.hdurl || entry.url;
		image.alt = entry.title;
		image.loading = 'lazy';
		article.appendChild(image);
	} else if (entry.media_type === 'video' && entry.url) {
		const videoLink = document.createElement('a');
		videoLink.href = entry.url;
		videoLink.target = '_blank';
		videoLink.rel = 'noopener noreferrer';
		videoLink.textContent = 'Watch this APOD video';
		article.appendChild(videoLink);
	}

	const title = document.createElement('h2');
	title.textContent = entry.title;
	article.appendChild(title);

	const date = document.createElement('p');
	date.textContent = entry.date;
	article.appendChild(date);

	return article;
}

function openAPODModal(entry) {
	modalImage.src = entry.hdurl || entry.url;
	modalImage.alt = entry.title;
	modalTitle.textContent = entry.title;
	modalDate.textContent = entry.date;
	modalExplanation.textContent = entry.explanation;
	apodModal.showModal();
}

function showMessage(message) {
	const messageElement = document.createElement('p');
	messageElement.className = 'placeholder';
	messageElement.setAttribute('role', 'status');
	messageElement.textContent = message;
	gallery.replaceChildren(messageElement);
}
