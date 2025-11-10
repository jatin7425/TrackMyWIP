async function correctGrammarClient(text) {
    try {
        const response = await fetch('/api/grammer/correct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            console.error('Grammar correction failed:', response.statusText);
            return text;
        }

        const data = await response.json();
        return data.text || text;
    } catch (err) {
        console.error('Error calling grammar correction API:', err);
        return text;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const addWipForm = document.getElementById('add-wip-form');
    const addBulletPointButton = document.getElementById('add-bullet-point');
    const bulletPointsContainer = document.getElementById('bullet-points-container');
    const previewList = document.getElementById('preview-list');
    const dateInput = document.getElementById('wip-date');

    // Helper: Update live preview
    const updatePreview = () => {
        const date = dateInput.value;
        const bulletInputs = document.querySelectorAll('input[name="bullet-points[]"]');
        const bullets = Array.from(bulletInputs)
            .map((input) => input.value.trim())
            .filter((text) => text !== '');

        previewList.innerHTML = '';

        if (date) {
            const dateItem = document.createElement('li');
            dateItem.innerHTML = `<strong>${date}</strong>`;
            previewList.appendChild(dateItem);
        }

        bullets.forEach((point) => {
            const li = document.createElement('li');
            li.textContent = '• ' + point;
            previewList.appendChild(li);
        });
    };

    // Helper: Create a new bullet input block
    const createBulletPointInput = () => {
        const div = document.createElement('div');
        div.className = 'bullet-point';

        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'bullet-points[]';
        input.placeholder = 'Enter bullet point';
        input.required = true;
        input.addEventListener('input', updatePreview);

        // Remove
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '❌';
        removeBtn.className = 'remove-btn';
        removeBtn.addEventListener('click', () => {
            div.remove();
            updatePreview();
        });

        // Move Up
        const moveUpBtn = document.createElement('button');
        moveUpBtn.type = 'button';
        moveUpBtn.textContent = '↑';
        moveUpBtn.title = 'Move Up';
        moveUpBtn.className = 'reposition-btn';
        moveUpBtn.addEventListener('click', () => {
            const prev = div.previousElementSibling;
            if (prev) {
                bulletPointsContainer.insertBefore(div, prev);
                updatePreview();
            }
        });

        // Move Down
        const moveDownBtn = document.createElement('button');
        moveDownBtn.type = 'button';
        moveDownBtn.textContent = '↓';
        moveDownBtn.title = 'Move Down';
        moveDownBtn.className = 'reposition-btn';
        moveDownBtn.addEventListener('click', () => {
            const next = div.nextElementSibling;
            if (next) {
                bulletPointsContainer.insertBefore(next, div);
                updatePreview();
            }
        });

        const checkGrammarBtn = document.createElement('button');
        checkGrammarBtn.type = 'button';
        checkGrammarBtn.textContent = '🧠 Fix';
        checkGrammarBtn.className = 'grammar-btn';
        checkGrammarBtn.addEventListener('click', async () => {
            const corrected = await correctGrammarClient(input.value);
            input.value = corrected;
            updatePreview();
        });

        div.append(moveUpBtn, moveDownBtn, input, checkGrammarBtn, removeBtn);
        bulletPointsContainer.appendChild(div);

        updatePreview();
    };

    // Add new bullet point field
    addBulletPointButton.addEventListener('click', (event) => {
        event.preventDefault();
        createBulletPointInput();
    });

    // Update preview when date changes
    dateInput.addEventListener('input', updatePreview);

    // Handle form submission - Save WIP data
    addWipForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const date = dateInput.value;
        const bulletInputs = document.querySelectorAll('input[name="bullet-points[]"]');
        const bullets = Array.from(bulletInputs)
            .map((input) => input.value.trim())
            .filter((text) => text !== '');

        if (!date || bullets.length === 0) {
            alert('Please add a date and at least one bullet point.');
            return;
        }

        // Extract year, month, and day for indexing
        const [year, month, day] = date.split('-');

        const newWip = {
            year,
            month,
            day,
            date,
            points: bullets,
            createdAt: new Date().toISOString(),
        };

        try {
            const response = await fetch('/api/wip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWip),
            });

            const result = await response.json();

            if (response.ok) {
                alert('WIP added successfully!');
                addWipForm.reset();
                bulletPointsContainer.innerHTML = '';
                updatePreview();
            } else {
                alert('Failed to add WIP: ' + (result.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error adding WIP:', err);
            alert('Network or server error.');
        }
    });
});
