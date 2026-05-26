// data_loader.v2.2.js
// data_loader.js  v2.0
// Handles CSV parsing, drag-and-drop loading, and course filtering.
// Tag weight functionality removed in v2.0.

// ── Global State ────────────────────────────────────────────────────────────
let objectives       = [];   // [{id, description, course, tags:[]}]
let allTags          = [];   // sorted unique tag list
let tagCounts        = {};   // tag -> count of objectives containing it
let excludedCourses  = new Set();  // courses toggled off by the user

// ── CSV Parsing ──────────────────────────────────────────────────────────────

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = parseCSVLine(lines[i]);
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
        data.push(obj);
    }
    return data;
}

// ── Load Objectives ──────────────────────────────────────────────────────────

function loadObjectivesFromCSV(text) {
    const rows = parseCSV(text);
    if (!rows.length) {
        alert('CSV appears empty or malformed.');
        return;
    }

    const sample = rows[0];
    const keys = Object.keys(sample);
    const descKey   = keys.find(k => k.includes('objective') || k.includes('description')) || keys[0];
    const courseKey = keys.find(k => k.includes('course') || k.includes('number'))        || keys[1];
    const tagsKey   = keys.find(k => k.includes('tag') || k.includes('skill'))            || keys[2];

    objectives = rows
        .filter(row => row[descKey] && row[descKey].trim())
        .map((row, i) => ({
            id:          `obj_${i}`,
            description: row[descKey].trim(),
            course:      (row[courseKey] || 'Unknown').trim(),
            tags:        (row[tagsKey] || '').split('|').map(t => t.trim()).filter(Boolean)
        }));

    if (!objectives.length) {
        alert('No valid objective rows found in CSV.');
        return;
    }

    // Compute tag statistics
    tagCounts = {};
    const tagSet = new Set();
    objectives.forEach(obj => {
        obj.tags.forEach(tag => {
            tagSet.add(tag);
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    allTags = [...tagSet].sort();

    // Reset excluded courses on fresh load
    excludedCourses = new Set();
    renderCourseChips();

    // Update status
    const statusEl = document.getElementById('data-status');
    statusEl.textContent = `${objectives.length} objectives \u00b7 ${allTags.length} unique tags`;
    statusEl.className = 'status-loaded';
}

// ── Course Exclusion Chips ────────────────────────────────────────────────────

function renderCourseChips() {
    const container = document.getElementById('course-chips');
    const summary   = document.getElementById('course-chips-summary');
    if (!container) return;

    const courses = [...new Set(objectives.map(o => o.course))].sort();

    container.innerHTML = '';
    courses.forEach(course => {
        const isExcluded = excludedCourses.has(course);
        const chip = document.createElement('button');
        chip.className = `course-chip ${isExcluded ? 'excluded' : 'included'}`;
        chip.textContent = course;
        chip.title = isExcluded
            ? `${course} \u2014 excluded (click to include)`
            : `${course} \u2014 included (click to exclude)`;
        chip.onclick = () => {
            if (excludedCourses.has(course)) excludedCourses.delete(course);
            else excludedCourses.add(course);
            renderCourseChips();
            rebuildAndDraw();
        };
        container.appendChild(chip);
    });

    if (summary) {
        const active = courses.filter(c => !excludedCourses.has(c)).length;
        if (excludedCourses.size === 0) {
            summary.innerHTML = `All ${courses.length} courses active`;
        } else {
            summary.innerHTML = `${active} of ${courses.length} courses active &nbsp;&middot;&nbsp; <a href="#" class="chips-reset" onclick="resetCourseExclusions();return false;">reset</a>`;
        }
    }
}

function resetCourseExclusions() {
    excludedCourses = new Set();
    renderCourseChips();
    rebuildAndDraw();
}

function getActiveObjectives() {
    if (!excludedCourses.size) return objectives;
    return objectives.filter(o => !excludedCourses.has(o.course));
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────

function setupDropZone() {
    const overlay = document.getElementById('drop-overlay');

    document.addEventListener('dragover', e => {
        e.preventDefault();
        overlay.classList.add('visible');
    });

    document.addEventListener('dragleave', e => {
        if (e.relatedTarget === null) overlay.classList.remove('visible');
    });

    document.addEventListener('drop', e => {
        e.preventDefault();
        overlay.classList.remove('visible');
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please drop a .csv file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = ev => {
            loadObjectivesFromCSV(ev.target.result);
            rebuildAndDraw();
        };
        reader.readAsText(file);
    });
}
