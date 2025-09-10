// Research Manager Web App
// Current logged-in user name (will be set after login)
let currentUserName = null;

// Data storage keys will be generated based on the logged-in user
let STORAGE_KEYS = {
  papers: '',
  journals: '',
  conferences: '',
};

function setStorageKeysForUser(userName) {
  const prefix = `researchManager_${userName}_`;
  STORAGE_KEYS = {
    papers: `${prefix}papers`,
    journals: `${prefix}journals`,
    conferences: `${prefix}conferences`,
  };
}

// Global arrays
let papers = [];
let journals = [];
let conferences = [];

// Helper: load from localStorage
function loadData() {
  try {
    papers = JSON.parse(localStorage.getItem(STORAGE_KEYS.papers)) || [];
    journals = JSON.parse(localStorage.getItem(STORAGE_KEYS.journals)) || [];
    conferences = JSON.parse(localStorage.getItem(STORAGE_KEYS.conferences)) || [];
  } catch (err) {
    console.warn('Error parsing stored data', err);
    papers = [];
    journals = [];
    conferences = [];
  }
}

// Helper: save to localStorage
function saveData() {
  localStorage.setItem(STORAGE_KEYS.papers, JSON.stringify(papers));
  localStorage.setItem(STORAGE_KEYS.journals, JSON.stringify(journals));
  localStorage.setItem(STORAGE_KEYS.conferences, JSON.stringify(conferences));
}

// Helper: format date as "Mon DD, YYYY"
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

// Helper: difference in days between dateStr and today
function daysUntil(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Helper: get progress percentage based on status
function getProgressFromStatus(status) {
  switch (status) {
    case 'idea':
      return 0;
    case 'planning':
      return 25;
    case 'writing':
      return 60;
    case 'submitted':
      return 100;
    default:
      return 0;
  }
}

// Rendering functions
function renderDashboard() {
  // Active papers count (all except submitted)
  const active = papers.filter((p) => p.status !== 'submitted');
  document.getElementById('activePapersCount').textContent = active.length;
  // Due this week (deadline within next 7 days)
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7);
  const dueThisWeek = active.filter((p) => {
    if (!p.deadline) return false;
    const d = new Date(p.deadline);
    return d >= now && d <= endOfWeek;
  });
  document.getElementById('dueThisWeekCount').textContent = dueThisWeek.length;

  // Urgent deadlines (within 3 days)
  const urgentList = document.getElementById('urgentDeadlinesList');
  urgentList.innerHTML = '';
  const urgent = active
    .filter((p) => p.deadline)
    .filter((p) => {
      const days = daysUntil(p.deadline);
      return days !== null && days <= 3 && days >= 0;
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  if (urgent.length === 0) {
    // show empty state
    urgentList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <p>No urgent deadlines</p>
      </div>`;
  } else {
    urgent.forEach((p) => {
      const days = daysUntil(p.deadline);
      const div = document.createElement('div');
      div.className = 'paper-card';
      div.innerHTML = `
        <div class="paper-title">${p.title}</div>
        <div class="paper-meta">Due in <strong>${days}</strong> day${days !== 1 ? 's' : ''} – ${formatDate(p.deadline)}</div>
        <div class="progress-bar"><div class="progress-bar-inner" style="width:${getProgressFromStatus(p.status)}%"></div></div>
        <div class="progress-label">${getProgressFromStatus(p.status)}%</div>
      `;
      urgentList.appendChild(div);
    });
  }

  // Recent papers: last 3 added
  const recentList = document.getElementById('recentPapersList');
  recentList.innerHTML = '';
  const recent = papers.slice().reverse().slice(0, 3);
  if (recent.length === 0) {
    recentList.innerHTML = '<p class="muted">No papers yet.</p>';
  } else {
    recent.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'paper-card';
      card.innerHTML = `
        <button class="edit-btn" data-id="${p.id}" data-type="paper" aria-label="Edit paper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
        </button>
        <div class="paper-title">${p.title}</div>
        <div class="paper-description">${p.description || ''}</div>
        <div class="paper-meta">
          ${p.journalIds && p.journalIds.length > 0 ? `<span>Journal: ${p.journalIds.map((id) => getJournalNameById(id)).join(', ')}</span>` : ''}
          ${p.deadline ? `<span>• Deadline: ${formatDate(p.deadline)}</span>` : ''}
        </div>
        <span class="paper-badge">${capitalize(p.status || 'idea')} Phase</span>
        <div class="progress-bar"><div class="progress-bar-inner" style="width:${getProgressFromStatus(p.status)}%"></div></div>
        <div class="progress-label">${getProgressFromStatus(p.status)}%</div>
      `;
      recentList.appendChild(card);
    });
  }
}

// Get journal name by id
function getJournalNameById(id) {
  const j = journals.find((j) => j.id === id);
  return j ? j.name : '';
}

// Capitalize first letter
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Render papers list with optional status filter
function renderPapersList(filter = 'all') {
  const list = document.getElementById('papersList');
  list.innerHTML = '';
  let items = papers.slice();
  if (filter !== 'all') {
    items = items.filter((p) => p.status === filter);
  }
  if (items.length === 0) {
    list.innerHTML = '<p class="muted">No papers found.</p>';
    return;
  }
  items.forEach((p, index) => {
    const card = document.createElement('div');
    card.className = 'paper-card';
    card.innerHTML = `
      <button class="edit-btn" data-id="${p.id}" data-type="paper" aria-label="Edit paper">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
      </button>
      <div class="paper-title">${p.title}</div>
      <div class="paper-description">${p.description || ''}</div>
      <div class="paper-meta">
        ${p.journalIds && p.journalIds.length > 0 ? `<span>Journal: ${p.journalIds.map((id) => getJournalNameById(id)).join(', ')}</span>` : ''}
        ${p.deadline ? `<span>• Deadline: ${formatDate(p.deadline)}</span>` : ''}
      </div>
      <span class="paper-badge">${capitalize(p.status)} Phase</span>
      <div class="progress-bar"><div class="progress-bar-inner" style="width:${getProgressFromStatus(p.status)}%"></div></div>
      <div class="progress-label">${getProgressFromStatus(p.status)}%</div>
    `;
    list.appendChild(card);
  });
  // update count on 'All' tab
  document.getElementById('papersCount').textContent = papers.length;
}

// Render journals list
function renderJournalsList() {
  const list = document.getElementById('journalsList');
  list.innerHTML = '';
  if (journals.length === 0) {
    list.innerHTML = '<p class="muted">No journals added yet.</p>';
    return;
  }
  journals.forEach((j) => {
    const card = document.createElement('div');
    card.className = 'journal-card';
    card.innerHTML = `
      <button class="edit-btn" data-id="${j.id}" data-type="journal" aria-label="Edit journal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
      </button>
      <div class="journal-name">${j.name}</div>
      <div class="journal-publisher">${j.publisher || ''}</div>
      ${j.ifValue ? `<div class="journal-if">IF: ${j.ifValue}</div>` : ''}
      <div class="journal-actions">
        ${j.link ? `<a href="${j.link}" target="_blank" rel="noopener noreferrer">Visit</a>` : ''}
        ${j.category ? `<span>${j.category}</span>` : ''}
      </div>
    `;
    list.appendChild(card);
  });
}

// Render conferences list
function renderConferencesList() {
  const list = document.getElementById('conferencesList');
  list.innerHTML = '';
  if (conferences.length === 0) {
    list.innerHTML = '<p class="muted">No conferences added yet.</p>';
    return;
  }
  conferences.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'conference-card';
    card.innerHTML = `
      <button class="edit-btn" data-id="${c.id}" data-type="conference" aria-label="Edit conference">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
      </button>
      <div class="conference-name">${c.name}</div>
      <div class="conference-date">${c.date ? formatDate(c.date) : ''}</div>
      <div class="conference-actions">
        ${c.link ? `<a href="${c.link}" target="_blank" rel="noopener noreferrer">Visit</a>` : ''}
      </div>
    `;
    list.appendChild(card);
  });
}

// Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      showPage(target);
      navItems.forEach((i) => i.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  // 'View All' button on dashboard
  const viewAllBtns = document.querySelectorAll('.view-all-btn');
  viewAllBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = btn.getAttribute('data-target');
      // highlight corresponding nav item
      document.querySelectorAll('.nav-item').forEach((i) => {
        if (i.getAttribute('data-target') === target) i.classList.add('active');
        else i.classList.remove('active');
      });
      showPage(target);
    });
  });
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach((p) => {
    if (p.id === pageId) p.classList.remove('hidden');
    else p.classList.add('hidden');
  });
  // we no longer manage floating action buttons; add-circle-btns are part of section headers
}

// Modal logic
const modalOverlay = document.getElementById('modalOverlay');
const modalTitleEl = document.getElementById('modalTitle');
const modalContentEl = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModalBtn');

function openModal(title, contentEl, onSaveCallback) {
  modalTitleEl.textContent = title;
  modalContentEl.innerHTML = '';
  modalContentEl.appendChild(contentEl);
  modalOverlay.classList.remove('hidden');
  // attach save handler to inside form's onsubmit
  modalContentEl.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    onSaveCallback(new FormData(e.target));
  };
}

function closeModal() {
  modalOverlay.classList.add('hidden');
}

closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModal();
  }
});

// Global edit button handler using event delegation
document.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.edit-btn');
  if (!editBtn) return;
  const type = editBtn.dataset.type;
  const id = editBtn.dataset.id;
  if (type === 'paper') {
    showEditPaperModal(id);
  } else if (type === 'journal') {
    showEditJournalModal(id);
  } else if (type === 'conference') {
    showEditConferenceModal(id);
  }
});

// Show edit paper modal
function showEditPaperModal(paperId) {
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) return;
  const form = document.createElement('form');
  // Prepare selected journals options
  const journalOptions = journals
    .map(
      (j) =>
        `<option value="${j.id}" ${paper.journalIds && paper.journalIds.includes(j.id) ? 'selected' : ''}>${j.name}</option>`
    )
    .join('');
  const dateValue = paper.deadline ? new Date(paper.deadline).toISOString().substr(0, 10) : '';
  form.innerHTML = `
    <div class="form-group">
      <label for="editPaperTitle">Title</label>
      <input type="text" id="editPaperTitle" name="title" value="${paper.title}" required />
    </div>
    <div class="form-group">
      <label for="editPaperDescription">Description</label>
      <textarea id="editPaperDescription" name="description">${paper.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label for="editPaperDeadline">Deadline</label>
      <input type="date" id="editPaperDeadline" name="deadline" value="${dateValue}" />
    </div>
    <div class="form-group">
      <label for="editPaperStatus">Phase</label>
      <select id="editPaperStatus" name="status">
        <option value="idea" ${paper.status === 'idea' ? 'selected' : ''}>Idea</option>
        <option value="planning" ${paper.status === 'planning' ? 'selected' : ''}>Planning</option>
        <option value="writing" ${paper.status === 'writing' ? 'selected' : ''}>Writing</option>
        <option value="submitted" ${paper.status === 'submitted' ? 'selected' : ''}>Submitted</option>
      </select>
    </div>
    <div class="form-group">
      <label for="editPaperJournals">Link to Journals (optional)</label>
      <select id="editPaperJournals" name="journalIds" multiple size="${Math.min(journals.length, 4)}">
        ${journalOptions}
      </select>
      <small>Select one or more journals</small>
    </div>
    <div class="form-group">
      <label for="editPaperConference">Conference URL (optional)</label>
      <input type="url" id="editPaperConference" name="conferenceLink" value="${paper.conferenceLink || ''}" placeholder="https://" />
    </div>
    <div class="form-group">
      <label for="editPaperNotes">Notes (optional)</label>
      <textarea id="editPaperNotes" name="notes">${paper.notes || ''}</textarea>
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" id="cancelEditPaper">Cancel</button>
      <button type="submit" class="btn-primary">Save</button>
    </div>
  `;
  openModal('Edit Paper', form, (formData) => {
    // Update paper with new values
    paper.title = formData.get('title').trim();
    paper.description = formData.get('description').trim();
    paper.deadline = formData.get('deadline') || null;
    paper.status = formData.get('status');
    paper.journalIds = formData.getAll('journalIds');
    paper.conferenceLink = formData.get('conferenceLink').trim() || null;
    paper.notes = formData.get('notes').trim() || null;
    saveData();
    renderDashboard();
    // re-render with current filter
    const activeStatus = document.querySelector('#papersFilterTabs .tab.active').getAttribute('data-status');
    renderPapersList(activeStatus);
    closeModal();
  });
  form.querySelector('#cancelEditPaper').addEventListener('click', () => {
    closeModal();
  });
}

// Show edit journal modal
function showEditJournalModal(journalId) {
  const journal = journals.find((j) => j.id === journalId);
  if (!journal) return;
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-group">
      <label for="editJournalName">Journal Name</label>
      <input type="text" id="editJournalName" name="name" value="${journal.name}" required />
    </div>
    <div class="form-group">
      <label for="editJournalPublisher">Publisher</label>
      <input type="text" id="editJournalPublisher" name="publisher" value="${journal.publisher}" />
    </div>
    <div class="form-group">
      <label for="editJournalCategory">Subject/Category (optional)</label>
      <input type="text" id="editJournalCategory" name="category" value="${journal.category}" />
    </div>
    <div class="form-group">
      <label for="editJournalLink">Website URL</label>
      <input type="url" id="editJournalLink" name="link" value="${journal.link}" placeholder="https://" />
      <small>Enter the journal's website link. Impact factor can be filled manually below.</small>
    </div>
    <div class="form-group">
      <label for="editJournalIF">Impact Factor (IF)</label>
      <input type="number" step="0.001" id="editJournalIF" name="ifValue" value="${journal.ifValue}" placeholder="e.g. 5.123" />
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" id="cancelEditJournal">Cancel</button>
      <button type="submit" class="btn-primary">Save</button>
    </div>
  `;
  openModal('Edit Journal', form, (formData) => {
    journal.name = formData.get('name').trim();
    journal.publisher = formData.get('publisher').trim() || '';
    journal.category = formData.get('category').trim() || '';
    journal.link = formData.get('link').trim() || '';
    journal.ifValue = formData.get('ifValue').trim() || '';
    saveData();
    renderJournalsList();
    renderDashboard();
    closeModal();
  });
  form.querySelector('#cancelEditJournal').addEventListener('click', () => {
    closeModal();
  });
}

// Show edit conference modal
function showEditConferenceModal(confId) {
  const conf = conferences.find((c) => c.id === confId);
  if (!conf) return;
  const form = document.createElement('form');
  const dateVal = conf.date ? new Date(conf.date).toISOString().substr(0, 10) : '';
  form.innerHTML = `
    <div class="form-group">
      <label for="editConfName">Conference Name</label>
      <input type="text" id="editConfName" name="name" value="${conf.name}" required />
    </div>
    <div class="form-group">
      <label for="editConfDate">Date</label>
      <input type="date" id="editConfDate" name="date" value="${dateVal}" />
    </div>
    <div class="form-group">
      <label for="editConfLink">Website URL</label>
      <input type="url" id="editConfLink" name="link" value="${conf.link}" placeholder="https://" />
    </div>
    <div class="form-group">
      <label for="editConfDescription">Description (optional)</label>
      <textarea id="editConfDescription" name="description">${conf.description || ''}</textarea>
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" id="cancelEditConf">Cancel</button>
      <button type="submit" class="btn-primary">Save</button>
    </div>
  `;
  openModal('Edit Conference', form, (formData) => {
    conf.name = formData.get('name').trim();
    conf.date = formData.get('date') || '';
    conf.link = formData.get('link').trim() || '';
    conf.description = formData.get('description').trim() || '';
    saveData();
    renderConferencesList();
    renderDashboard();
    closeModal();
  });
  form.querySelector('#cancelEditConf').addEventListener('click', () => {
    closeModal();
  });
}

// Show add paper modal
function showAddPaperModal() {
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-group">
      <label for="paperTitle">Title</label>
      <input type="text" id="paperTitle" name="title" required />
    </div>
    <div class="form-group">
      <label for="paperDescription">Description</label>
      <textarea id="paperDescription" name="description" placeholder="Describe your paper idea"></textarea>
    </div>
    <div class="form-group">
      <label for="paperDeadline">Deadline</label>
      <input type="date" id="paperDeadline" name="deadline" />
    </div>
    <div class="form-group">
      <label for="paperStatus">Phase</label>
      <select id="paperStatus" name="status">
        <option value="idea">Idea</option>
        <option value="planning">Planning</option>
        <option value="writing">Writing</option>
        <option value="submitted">Submitted</option>
      </select>
    </div>
    <div class="form-group">
      <label for="paperJournals">Link to Journals (optional)</label>
      <select id="paperJournals" name="journalIds" multiple size="${Math.min(journals.length, 4)}">
        ${journals
          .map((j) => `<option value="${j.id}">${j.name}</option>`) 
          .join('')}
      </select>
      <small>Select one or more journals</small>
    </div>
    <div class="form-group">
      <label for="paperConferences">Conference URL (optional)</label>
      <input type="url" id="paperConferences" name="conferenceLink" placeholder="https://" />
    </div>
    <div class="form-group">
      <label for="paperNotes">Notes (optional)</label>
      <textarea id="paperNotes" name="notes" placeholder="Additional notes"></textarea>
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" id="cancelPaperBtn">Cancel</button>
      <button type="submit" class="btn-primary">Save</button>
    </div>
  `;
  openModal('Add New Paper', form, (formData) => {
    // Build new paper object
    const newPaper = {
      id: Date.now().toString(),
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
      deadline: formData.get('deadline') || null,
      status: formData.get('status'),
      journalIds: formData.getAll('journalIds'),
      conferenceLink: formData.get('conferenceLink').trim() || null,
      notes: formData.get('notes').trim() || null,
      createdAt: new Date().toISOString(),
    };
    papers.push(newPaper);
    saveData();
    renderDashboard();
    renderPapersList(document.querySelector('.tab.active').dataset.status || 'all');
    closeModal();
  });
  // Cancel button handler
  form.querySelector('#cancelPaperBtn').addEventListener('click', () => {
    closeModal();
  });
}

// Show add journal modal
function showAddJournalModal() {
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-group">
      <label for="journalName">Journal Name</label>
      <input type="text" id="journalName" name="name" required />
    </div>
    <div class="form-group">
      <label for="journalPublisher">Publisher</label>
      <input type="text" id="journalPublisher" name="publisher" placeholder="Elsevier, Springer..." />
    </div>
    <div class="form-group">
      <label for="journalCategory">Subject/Category (optional)</label>
      <input type="text" id="journalCategory" name="category" placeholder="Energy, Environment, etc" />
    </div>
    <div class="form-group">
      <label for="journalLink">Website URL</label>
      <input type="url" id="journalLink" name="link" placeholder="https://" />
      <small>Enter the journal's website link. Impact factor can be filled manually below.</small>
    </div>
    <div class="form-group">
      <label for="journalIF">Impact Factor (IF)</label>
      <input type="number" step="0.001" id="journalIF" name="ifValue" placeholder="e.g. 5.123" />
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" id="cancelJournalBtn">Cancel</button>
      <button type="submit" class="btn-primary">Save</button>
    </div>
  `;
  openModal('Add New Journal', form, (formData) => {
    const newJournal = {
      id: Date.now().toString(),
      name: formData.get('name').trim(),
      publisher: formData.get('publisher').trim() || '',
      category: formData.get('category').trim() || '',
      link: formData.get('link').trim() || '',
      ifValue: formData.get('ifValue').trim() || '',
      createdAt: new Date().toISOString(),
    };
    journals.push(newJournal);
    saveData();
    renderJournalsList();
    closeModal();
  });
  form.querySelector('#cancelJournalBtn').addEventListener('click', () => {
    closeModal();
  });
}

// Show add conference modal
function showAddConferenceModal() {
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-group">
      <label for="confName">Conference Name</label>
      <input type="text" id="confName" name="name" required />
    </div>
    <div class="form-group">
      <label for="confDate">Date</label>
      <input type="date" id="confDate" name="date" />
    </div>
    <div class="form-group">
      <label for="confLink">Website URL</label>
      <input type="url" id="confLink" name="link" placeholder="https://" />
    </div>
    <div class="form-group">
      <label for="confDescription">Description (optional)</label>
      <textarea id="confDescription" name="description" placeholder="Describe the conference"></textarea>
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" id="cancelConfBtn">Cancel</button>
      <button type="submit" class="btn-primary">Save</button>
    </div>
  `;
  openModal('Add New Conference', form, (formData) => {
    const newConference = {
      id: Date.now().toString(),
      name: formData.get('name').trim(),
      date: formData.get('date') || '',
      link: formData.get('link').trim() || '',
      description: formData.get('description').trim() || '',
      createdAt: new Date().toISOString(),
    };
    conferences.push(newConference);
    saveData();
    renderConferencesList();
    closeModal();
  });
  form.querySelector('#cancelConfBtn').addEventListener('click', () => {
    closeModal();
  });
}

// Initialize application for a given user
function startAppForUser(userName) {
  currentUserName = userName;
  setStorageKeysForUser(userName);
  // Update displayed user name
  const nameEl = document.getElementById('displayUserName');
  if (nameEl) nameEl.textContent = userName;
  // Hide login and show app
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  // Load data and render
  loadData();
  renderDashboard();
  renderPapersList();
  renderJournalsList();
  renderConferencesList();
  initNavigation();
  showPage('dashboardPage');
  // Attach button handlers for add actions
  document.getElementById('addPaperBtn').addEventListener('click', showAddPaperModal);
  document.getElementById('addJournalBtn').addEventListener('click', showAddJournalModal);
  document.getElementById('addConferenceBtn').addEventListener('click', showAddConferenceModal);
  // Paper filter tabs events
  document.querySelectorAll('#papersFilterTabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#papersFilterTabs .tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const status = tab.getAttribute('data-status');
      renderPapersList(status);
    });
  });
}

// Set up login and initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const storedName = localStorage.getItem('researchManager_userName');
  // Set up login form handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('userNameInput');
      const name = input.value.trim();
      if (!name) return;
      localStorage.setItem('researchManager_userName', name);
      startAppForUser(name);
    });
  }
  if (storedName) {
    startAppForUser(storedName);
  } else {
    // Show login page if no name stored
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
});