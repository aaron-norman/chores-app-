/**
 * Chores - Chore management module
 */
const Chores = {
    currentChoreId: null,
    currentChoreInstance: null,

    /**
     * Show the add chore form modal
     */
    showAddChoreForm(prefilledDate = null) {
        const template = document.getElementById('chore-form-template');
        const content = template.content.cloneNode(true);

        App.showModal('Add Chore', content);
        this.initChoreForm();

        // Pre-fill date if provided
        if (prefilledDate) {
            document.getElementById('chore-due-date').value = prefilledDate;
        } else {
            // Default to next hour
            const now = new Date();
            now.setHours(now.getHours() + 1, 0, 0, 0);
            document.getElementById('chore-due-date').value = this.formatDateTimeLocal(now);
        }

        // Populate assignee dropdown
        Team.populateAssigneeDropdowns();

        document.getElementById('chore-title').focus();
    },

    /**
     * Show the edit chore form modal
     */
    showEditChoreForm(choreId, isRecurring = false) {
        const chore = isRecurring
            ? Storage.getRecurringChoreById(choreId)
            : Storage.getChoreById(choreId);

        if (!chore) return;

        const template = document.getElementById('chore-form-template');
        const content = template.content.cloneNode(true);

        App.showModal('Edit Chore', content);
        this.initChoreForm();

        // Populate form with existing data
        document.getElementById('chore-id').value = chore.id;
        document.getElementById('chore-title').value = chore.title;
        document.getElementById('chore-description').value = chore.description || '';
        document.getElementById('chore-assignee').value = chore.assigned_to || '';

        if (isRecurring) {
            document.getElementById('chore-recurring').checked = true;
            this.toggleRecurringFields(true);

            if (chore.recurrence_rule) {
                const preset = chore.recurrence_rule.preset || 'custom';
                document.getElementById('recurrence-preset').value = preset;

                // Extract time from cron
                const cronParts = chore.recurrence_rule.cron.split(' ');
                if (cronParts.length >= 2) {
                    const hour = cronParts[1].padStart(2, '0');
                    const minute = cronParts[0].padStart(2, '0');
                    document.getElementById('recurrence-time').value = `${hour}:${minute}`;
                }

                if (preset === 'custom') {
                    document.getElementById('custom-cron').value = chore.recurrence_rule.cron;
                    document.getElementById('custom-cron-group').classList.remove('hidden');
                }
            }
        } else {
            document.getElementById('chore-due-date').value = this.formatDateTimeLocal(new Date(chore.due_date));
        }

        // Populate assignee dropdown
        Team.populateAssigneeDropdowns();
        document.getElementById('chore-assignee').value = chore.assigned_to || '';

        // Store current state
        this.currentChoreId = chore.id;
        this.currentChoreInstance = { isRecurring };

        document.getElementById('chore-title').focus();
    },

    /**
     * Show chore details modal
     */
    showChoreDetail(choreId, isRecurring = false, instanceDate = null) {
        const chore = isRecurring
            ? Storage.getRecurringChoreById(choreId)
            : Storage.getChoreById(choreId);

        if (!chore) return;

        const template = document.getElementById('chore-detail-template');
        const content = template.content.cloneNode(true);

        App.showModal(chore.title, content);

        // Determine due date for completion check
        const dueDate = instanceDate || chore.due_date;
        const isCompleted = Storage.isChoreCompleted(choreId, dueDate);
        const isOverdue = !isCompleted && new Date(dueDate) < new Date();

        // Status badge
        const statusEl = document.getElementById('detail-status');
        if (isCompleted) {
            statusEl.textContent = 'Completed';
            statusEl.className = 'chore-status completed';
        } else if (isOverdue) {
            statusEl.textContent = 'Overdue';
            statusEl.className = 'chore-status overdue';
        } else {
            statusEl.textContent = 'Pending';
            statusEl.className = 'chore-status pending';
        }

        // Description
        document.getElementById('detail-description').textContent = chore.description || 'No description';

        // Assignee
        document.getElementById('detail-assignee').textContent = Team.getMemberName(chore.assigned_to);

        // Due date
        const dueDateDisplay = instanceDate
            ? new Date(instanceDate).toLocaleString()
            : (chore.due_date ? new Date(chore.due_date).toLocaleString() : 'N/A');
        document.getElementById('detail-due').textContent = dueDateDisplay;

        // Recurrence
        const recurrenceRow = document.getElementById('detail-recurrence-row');
        if (isRecurring && chore.recurrence_rule) {
            recurrenceRow.style.display = 'block';
            document.getElementById('detail-recurrence').textContent = chore.recurrence_rule.human_readable;
        } else {
            recurrenceRow.style.display = 'none';
        }

        // Action buttons
        const editBtn = document.getElementById('edit-chore-btn');
        const deleteBtn = document.getElementById('delete-chore-btn');
        const completeBtn = document.getElementById('complete-chore-btn');

        editBtn.addEventListener('click', () => {
            App.closeModal();
            this.showEditChoreForm(choreId, isRecurring);
        });

        deleteBtn.addEventListener('click', () => {
            this.confirmDeleteChore(choreId, isRecurring);
        });

        if (isCompleted) {
            completeBtn.textContent = 'Completed';
            completeBtn.disabled = true;
            completeBtn.classList.remove('btn-success');
            completeBtn.classList.add('btn-secondary');
        } else {
            completeBtn.addEventListener('click', () => {
                this.markComplete(choreId, chore.title, dueDate);
            });
        }

        // Store current context
        this.currentChoreId = choreId;
        this.currentChoreInstance = { isRecurring, instanceDate };
    },

    /**
     * Initialize chore form event listeners
     */
    initChoreForm() {
        const form = document.getElementById('chore-form');
        const cancelBtn = document.getElementById('cancel-chore');
        const recurringCheckbox = document.getElementById('chore-recurring');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChoreFormSubmit(form);
        });

        cancelBtn.addEventListener('click', () => {
            App.closeModal();
        });

        recurringCheckbox.addEventListener('change', (e) => {
            this.toggleRecurringFields(e.target.checked);
        });

        // Initialize recurring module handlers
        Recurring.init();
    },

    /**
     * Toggle recurring fields visibility
     */
    toggleRecurringFields(isRecurring) {
        const dueDateGroup = document.getElementById('due-date-group');
        const recurrenceGroup = document.getElementById('recurrence-group');
        const dueDateInput = document.getElementById('chore-due-date');

        if (isRecurring) {
            dueDateGroup.classList.add('hidden');
            recurrenceGroup.classList.remove('hidden');
            dueDateInput.removeAttribute('required');
        } else {
            dueDateGroup.classList.remove('hidden');
            recurrenceGroup.classList.add('hidden');
            dueDateInput.setAttribute('required', '');
        }
    },

    /**
     * Handle chore form submission
     */
    handleChoreFormSubmit(form) {
        const formData = new FormData(form);
        const id = formData.get('id');
        const title = formData.get('title').trim();
        const description = formData.get('description').trim();
        const assignedTo = formData.get('assigned_to') || null;
        const isRecurring = formData.get('is_recurring') === 'on';

        if (!title) {
            App.showToast('Please enter a title', 'error');
            return;
        }

        if (isRecurring) {
            const preset = formData.get('recurrence_preset');
            const time = formData.get('recurrence_time') || '09:00';
            const customCron = formData.get('custom_cron');
            const referenceDate = new Date();

            const recurrenceRule = Recurring.createRule(preset, time, referenceDate, customCron);

            if (id && this.currentChoreInstance?.isRecurring) {
                // Update existing recurring chore
                Storage.updateRecurringChore(id, {
                    title,
                    description,
                    assigned_to: assignedTo,
                    recurrence_rule: recurrenceRule
                });
                App.showToast('Recurring chore updated', 'success');
            } else if (id) {
                // Converting one-time to recurring - delete old, create new
                Storage.deleteChore(id);
                Storage.addRecurringChore({
                    title,
                    description,
                    assigned_to: assignedTo,
                    recurrence_rule: recurrenceRule
                });
                App.showToast('Chore converted to recurring', 'success');
            } else {
                // Add new recurring chore
                Storage.addRecurringChore({
                    title,
                    description,
                    assigned_to: assignedTo,
                    recurrence_rule: recurrenceRule
                });
                App.showToast('Recurring chore added', 'success');
            }
        } else {
            const dueDate = formData.get('due_date');

            if (!dueDate) {
                App.showToast('Please select a due date', 'error');
                return;
            }

            if (id && this.currentChoreInstance?.isRecurring) {
                // Converting recurring to one-time - delete old, create new
                Storage.deleteRecurringChore(id);
                Storage.addChore({
                    title,
                    description,
                    assigned_to: assignedTo,
                    due_date: new Date(dueDate).toISOString()
                });
                App.showToast('Chore converted to one-time', 'success');
            } else if (id) {
                // Update existing one-time chore
                Storage.updateChore(id, {
                    title,
                    description,
                    assigned_to: assignedTo,
                    due_date: new Date(dueDate).toISOString()
                });
                App.showToast('Chore updated', 'success');
            } else {
                // Add new one-time chore
                Storage.addChore({
                    title,
                    description,
                    assigned_to: assignedTo,
                    due_date: new Date(dueDate).toISOString()
                });
                App.showToast('Chore added', 'success');
            }
        }

        App.closeModal();
        Calendar.render();
        this.renderChoresList();
        this.currentChoreId = null;
        this.currentChoreInstance = null;
    },

    /**
     * Confirm and delete a chore
     */
    confirmDeleteChore(choreId, isRecurring = false) {
        const chore = isRecurring
            ? Storage.getRecurringChoreById(choreId)
            : Storage.getChoreById(choreId);

        if (!chore) return;

        const message = isRecurring
            ? `Delete recurring chore "${chore.title}"? All future occurrences will be removed.`
            : `Delete chore "${chore.title}"?`;

        if (confirm(message)) {
            if (isRecurring) {
                Storage.deleteRecurringChore(choreId);
            } else {
                Storage.deleteChore(choreId);
            }
            App.showToast('Chore deleted', 'success');
            App.closeModal();
            Calendar.render();
            this.renderChoresList();
        }
    },

    /**
     * Mark a chore as complete
     */
    markComplete(choreId, choreTitle, dueDate) {
        // Show assignee selection for completion
        const members = Storage.getTeamMembers();

        if (members.length === 0) {
            // No team members, just complete without assignee
            Storage.addCompletion({
                chore_id: choreId,
                chore_title: choreTitle,
                completed_by: null,
                due_date: dueDate
            });
            App.showToast('Chore marked complete', 'success');
            App.closeModal();
            Calendar.render();
            this.renderChoresList();
            this.renderHistory();
            return;
        }

        // Simple completion with the assigned person or first available
        const chore = Storage.getChoreById(choreId) || Storage.getRecurringChoreById(choreId);
        const completedBy = chore?.assigned_to || null;

        Storage.addCompletion({
            chore_id: choreId,
            chore_title: choreTitle,
            completed_by: completedBy,
            due_date: dueDate
        });

        App.showToast('Chore marked complete', 'success');
        App.closeModal();
        Calendar.render();
        this.renderChoresList();
        this.renderHistory();
    },

    /**
     * Render the chores list view
     */
    renderChoresList() {
        const choresList = document.getElementById('chores-list');
        const filterAssignee = document.getElementById('filter-assignee').value;
        const filterStatus = document.getElementById('filter-status').value;

        // Get all chores (one-time and expanded recurring)
        const oneTimeChores = Storage.getChores();
        const recurringChores = Recurring.expandForWeek(Storage.getWeekStart(new Date()));

        let allChores = [...oneTimeChores, ...recurringChores];

        // Sort by due date
        allChores.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

        // Apply filters
        if (filterAssignee) {
            allChores = allChores.filter(c => c.assigned_to === filterAssignee);
        }

        if (filterStatus) {
            const now = new Date();
            allChores = allChores.filter(c => {
                const isCompleted = Storage.isChoreCompleted(c.original_id || c.id, c.due_date);
                const isOverdue = !isCompleted && new Date(c.due_date) < now;

                switch (filterStatus) {
                    case 'completed': return isCompleted;
                    case 'pending': return !isCompleted && !isOverdue;
                    case 'overdue': return isOverdue;
                    default: return true;
                }
            });
        }

        if (allChores.length === 0) {
            choresList.innerHTML = '<div class="empty-state">No chores found.</div>';
            return;
        }

        choresList.innerHTML = allChores.map(chore => {
            const choreId = chore.original_id || chore.id;
            const isCompleted = Storage.isChoreCompleted(choreId, chore.due_date);
            const isOverdue = !isCompleted && new Date(chore.due_date) < new Date();
            const memberColor = Team.getMemberColor(chore.assigned_to);

            return `
                <div class="chore-list-item ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}"
                     data-id="${choreId}"
                     data-recurring="${chore.is_recurring || false}"
                     data-due="${chore.due_date}">
                    <div class="chore-color" style="background-color: ${memberColor}"></div>
                    <div class="chore-info">
                        <div class="chore-title">${Team.escapeHtml(chore.title)}</div>
                        <div class="chore-meta">
                            ${Team.getMemberName(chore.assigned_to)} &bull;
                            ${new Date(chore.due_date).toLocaleString()}
                            ${chore.is_recurring ? ' &bull; Recurring' : ''}
                        </div>
                    </div>
                    ${isCompleted ? '<span style="color: var(--color-success);">&#10004;</span>' : ''}
                </div>
            `;
        }).join('');

        // Attach click handlers
        choresList.querySelectorAll('.chore-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const choreId = item.dataset.id;
                const isRecurring = item.dataset.recurring === 'true';
                const instanceDate = item.dataset.due;
                this.showChoreDetail(choreId, isRecurring, instanceDate);
            });
        });
    },

    /**
     * Render the completion history view
     */
    renderHistory() {
        const historyList = document.getElementById('history-list');
        const completions = Storage.getCompletions();

        // Sort by completion date, newest first
        completions.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

        if (completions.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No completed chores yet.</div>';
            return;
        }

        historyList.innerHTML = completions.map(completion => `
            <div class="history-item">
                <div class="history-icon">&#10004;</div>
                <div class="history-info">
                    <div class="history-title">${Team.escapeHtml(completion.chore_title)}</div>
                    <div class="history-meta">
                        Completed by ${Team.getMemberName(completion.completed_by)} &bull;
                        ${new Date(completion.completed_at).toLocaleString()}
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Format date for datetime-local input
     */
    formatDateTimeLocal(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    },

    /**
     * Initialize chores module
     */
    init() {
        // Add chore button
        document.getElementById('add-chore-btn').addEventListener('click', () => {
            this.showAddChoreForm();
        });

        // Filter change handlers
        document.getElementById('filter-assignee').addEventListener('change', () => {
            this.renderChoresList();
        });

        document.getElementById('filter-status').addEventListener('change', () => {
            this.renderChoresList();
        });

        this.renderChoresList();
        this.renderHistory();
    }
};
