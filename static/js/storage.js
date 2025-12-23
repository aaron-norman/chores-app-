/**
 * Storage - localStorage abstraction layer for the chores app
 */
const Storage = {
    KEYS: {
        TEAM: 'chores_app_team',
        CHORES: 'chores_app_chores',
        RECURRING: 'chores_app_recurring',
        COMPLETIONS: 'chores_app_completions',
        STATE: 'chores_app_state'
    },

    VERSION: '1.0',

    /**
     * Generate a UUID for new items
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Get data from localStorage
     */
    get(key) {
        try {
            const data = localStorage.getItem(this.KEYS[key.toUpperCase()]);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error reading ${key} from localStorage:`, e);
            return null;
        }
    },

    /**
     * Set data in localStorage
     */
    set(key, value) {
        try {
            localStorage.setItem(this.KEYS[key.toUpperCase()], JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error writing ${key} to localStorage:`, e);
            if (e.name === 'QuotaExceededError') {
                alert('Storage is full. Please export and clear some data.');
            }
            return false;
        }
    },

    /**
     * Initialize storage with default data if empty
     */
    init() {
        if (!this.get('team')) {
            this.set('team', []);
        }
        if (!this.get('chores')) {
            this.set('chores', []);
        }
        if (!this.get('recurring')) {
            this.set('recurring', []);
        }
        if (!this.get('completions')) {
            this.set('completions', []);
        }
        if (!this.get('state')) {
            this.set('state', {
                currentWeekStart: this.getWeekStart(new Date()).toISOString(),
                viewMode: 'calendar',
                lastUpdated: new Date().toISOString()
            });
        }
    },

    /**
     * Get the Monday of the week containing the given date
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    // Team Member Operations
    getTeamMembers() {
        return this.get('team') || [];
    },

    addTeamMember(member) {
        const members = this.getTeamMembers();
        const newMember = {
            id: this.generateId(),
            name: member.name,
            color: member.color || '#4A90D9',
            created_at: new Date().toISOString()
        };
        members.push(newMember);
        this.set('team', members);
        return newMember;
    },

    updateTeamMember(id, updates) {
        const members = this.getTeamMembers();
        const index = members.findIndex(m => m.id === id);
        if (index !== -1) {
            members[index] = { ...members[index], ...updates };
            this.set('team', members);
            return members[index];
        }
        return null;
    },

    deleteTeamMember(id) {
        const members = this.getTeamMembers();
        const filtered = members.filter(m => m.id !== id);
        this.set('team', filtered);
        return filtered.length < members.length;
    },

    getTeamMemberById(id) {
        const members = this.getTeamMembers();
        return members.find(m => m.id === id) || null;
    },

    // Chore Operations
    getChores() {
        return this.get('chores') || [];
    },

    addChore(chore) {
        const chores = this.getChores();
        const newChore = {
            id: this.generateId(),
            title: chore.title,
            description: chore.description || '',
            assigned_to: chore.assigned_to || null,
            due_date: chore.due_date,
            is_recurring: false,
            recurrence_rule: null,
            created_at: new Date().toISOString()
        };
        chores.push(newChore);
        this.set('chores', chores);
        return newChore;
    },

    updateChore(id, updates) {
        const chores = this.getChores();
        const index = chores.findIndex(c => c.id === id);
        if (index !== -1) {
            chores[index] = { ...chores[index], ...updates };
            this.set('chores', chores);
            return chores[index];
        }
        return null;
    },

    deleteChore(id) {
        const chores = this.getChores();
        const filtered = chores.filter(c => c.id !== id);
        this.set('chores', filtered);
        return filtered.length < chores.length;
    },

    getChoreById(id) {
        const chores = this.getChores();
        return chores.find(c => c.id === id) || null;
    },

    // Recurring Chore Operations
    getRecurringChores() {
        return this.get('recurring') || [];
    },

    addRecurringChore(chore) {
        const chores = this.getRecurringChores();
        const newChore = {
            id: this.generateId(),
            title: chore.title,
            description: chore.description || '',
            assigned_to: chore.assigned_to || null,
            recurrence_rule: chore.recurrence_rule,
            created_at: new Date().toISOString()
        };
        chores.push(newChore);
        this.set('recurring', chores);
        return newChore;
    },

    updateRecurringChore(id, updates) {
        const chores = this.getRecurringChores();
        const index = chores.findIndex(c => c.id === id);
        if (index !== -1) {
            chores[index] = { ...chores[index], ...updates };
            this.set('recurring', chores);
            return chores[index];
        }
        return null;
    },

    deleteRecurringChore(id) {
        const chores = this.getRecurringChores();
        const filtered = chores.filter(c => c.id !== id);
        this.set('recurring', filtered);
        return filtered.length < chores.length;
    },

    getRecurringChoreById(id) {
        const chores = this.getRecurringChores();
        return chores.find(c => c.id === id) || null;
    },

    // Completion Operations
    getCompletions() {
        return this.get('completions') || [];
    },

    addCompletion(completion) {
        const completions = this.getCompletions();
        const newCompletion = {
            id: this.generateId(),
            chore_id: completion.chore_id,
            chore_title: completion.chore_title,
            completed_by: completion.completed_by || null,
            completed_at: new Date().toISOString(),
            due_date: completion.due_date,
            notes: completion.notes || ''
        };
        completions.push(newCompletion);
        this.set('completions', completions);
        return newCompletion;
    },

    isChoreCompleted(choreId, dueDate) {
        const completions = this.getCompletions();
        return completions.some(c =>
            c.chore_id === choreId &&
            c.due_date === dueDate
        );
    },

    getCompletionForChore(choreId, dueDate) {
        const completions = this.getCompletions();
        return completions.find(c =>
            c.chore_id === choreId &&
            c.due_date === dueDate
        ) || null;
    },

    // State Operations
    getState() {
        return this.get('state') || {};
    },

    updateState(updates) {
        const state = this.getState();
        const newState = { ...state, ...updates, lastUpdated: new Date().toISOString() };
        this.set('state', newState);
        return newState;
    },

    // Export/Import Operations
    exportData() {
        return {
            version: this.VERSION,
            exported_at: new Date().toISOString(),
            team_members: this.getTeamMembers(),
            chores: this.getChores(),
            recurring_chores: this.getRecurringChores(),
            completions: this.getCompletions()
        };
    },

    importData(data) {
        try {
            if (data.team_members) this.set('team', data.team_members);
            if (data.chores) this.set('chores', data.chores);
            if (data.recurring_chores) this.set('recurring', data.recurring_chores);
            if (data.completions) this.set('completions', data.completions);
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    },

    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        this.init();
    }
};

// Initialize storage on load
Storage.init();
