// component/header.js

// This runs after the HTML is parsed (due to 'defer')
const header = document.getElementById('header');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');

// Function to update layout based on header height
const updateLayout = () => {
    const height = header.offsetHeight;
    sidebar.style.marginTop = `${height}px`;
    mainContent.style.marginTop = `${height}px`;
};

// 1. Update layout once styles are loaded
window.addEventListener('load', updateLayout);

// 2. Keep layout updated if window resizes
const headerObserver = new ResizeObserver(updateLayout);
headerObserver.observe(header);