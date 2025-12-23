/**
 * Calendar - Week view calendar component
 */
const Calendar = {
    currentWeekStart: null,
    timeSlots: [],
    HOUR_START: 6,  // 6 AM
    HOUR_END: 22,   // 10 PM

    /**
     * Initialize the calendar
     */
    init() {
        // Set current week
        this.currentWeekStart = Storage.getWeekStart(new Date());

        // Generate time slots
        this.timeSlots = [];
        for (let hour = this.HOUR_START; hour < this.HOUR_END; hour++) {
            this.timeSlots.push({
                hour,
                label: this.formatHour(hour)
            });
        }

        // Navigation event listeners
        document.getElementById('prev-week').addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('next-week').addEventListener('click', () => this.navigateWeek(1));
        document.getElementById('today-btn').addEventListener('click', () => this.goToToday());

        this.render();
    },

    /**
     * Navigate to previous or next week
     */
    navigateWeek(direction) {
        const newDate = new Date(this.currentWeekStart);
        newDate.setDate(newDate.getDate() + (direction * 7));
        this.currentWeekStart = newDate;
        this.render();
    },

    /**
     * Go to current week
     */
    goToToday() {
        this.currentWeekStart = Storage.getWeekStart(new Date());
        this.render();
    },

    /**
     * Get days of the current week
     */
    getWeekDays() {
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(date.getDate() + i);

            days.push({
                date,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: date.getDate(),
                isToday: date.getTime() === today.getTime(),
                dateStr: date.toISOString().split('T')[0]
            });
        }

        return days;
    },

    /**
     * Format hour for display
     */
    formatHour(hour) {
        if (hour === 0) return '12 AM';
        if (hour === 12) return '12 PM';
        if (hour < 12) return `${hour} AM`;
        return `${hour - 12} PM`;
    },

    /**
     * Render the calendar
     */
    render() {
        const grid = document.getElementById('calendar-grid');
        const weekDisplay = document.getElementById('week-display');
        const days = this.getWeekDays();

        // Update week display
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekDisplay.textContent = `${this.formatDateShort(this.currentWeekStart)} - ${this.formatDateShort(weekEnd)}`;

        // Get all chores for this week
        const oneTimeChores = Storage.getChores().filter(c => {
            const choreDate = new Date(c.due_date);
            return choreDate >= this.currentWeekStart && choreDate < new Date(weekEnd.getTime() + 86400000);
        });

        const recurringChores = Recurring.expandForWeek(this.currentWeekStart);
        const allChores = [...oneTimeChores, ...recurringChores];

        // Build grid HTML
        let html = '';

        // Header row
        html += '<div class="calendar-corner"></div>';
        days.forEach(day => {
            html += `
                <div class="calendar-day-header ${day.isToday ? 'today' : ''}">
                    <div class="day-name">${day.dayName}</div>
                    <div class="day-date">${day.dayNumber}</div>
                </div>
            `;
        });

        // Time slot rows
        this.timeSlots.forEach(slot => {
            // Time column
            html += `<div class="calendar-time">${slot.label}</div>`;

            // Day cells
            days.forEach(day => {
                const cellId = `cell-${day.dateStr}-${slot.hour}`;
                const isToday = day.isToday;

                // Get chores for this cell
                const cellChores = allChores.filter(chore => {
                    const choreDate = new Date(chore.due_date);
                    return choreDate.toDateString() === day.date.toDateString() &&
                           choreDate.getHours() === slot.hour;
                });

                html += `
                    <div class="calendar-cell ${isToday ? 'today' : ''}"
                         id="${cellId}"
                         data-date="${day.dateStr}"
                         data-hour="${slot.hour}">
                        ${this.renderCellChores(cellChores)}
                    </div>
                `;
            });
        });

        grid.innerHTML = html;

        // Attach cell click handlers
        grid.querySelectorAll('.calendar-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                // Don't trigger if clicking on a chore card
                if (e.target.closest('.chore-card')) return;

                const date = cell.dataset.date;
                const hour = cell.dataset.hour;
                const dateTime = `${date}T${String(hour).padStart(2, '0')}:00`;
                Chores.showAddChoreForm(dateTime);
            });
        });

        // Attach chore card click handlers
        grid.querySelectorAll('.chore-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                const choreId = card.dataset.id;
                const isRecurring = card.dataset.recurring === 'true';
                const instanceDate = card.dataset.due;
                Chores.showChoreDetail(choreId, isRecurring, instanceDate);
            });
        });
    },

    /**
     * Render chores in a cell
     */
    renderCellChores(chores) {
        if (chores.length === 0) return '';

        return chores.map(chore => {
            const choreId = chore.original_id || chore.id;
            const isCompleted = Storage.isChoreCompleted(choreId, chore.due_date);
            const isOverdue = !isCompleted && new Date(chore.due_date) < new Date();
            const memberColor = Team.getMemberColor(chore.assigned_to);
            const time = new Date(chore.due_date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

            const classes = [
                'chore-card',
                isCompleted ? 'completed' : '',
                isOverdue ? 'overdue' : ''
            ].filter(Boolean).join(' ');

            return `
                <div class="${classes}"
                     style="background-color: ${this.lightenColor(memberColor, 0.85)}; border-color: ${memberColor};"
                     data-id="${choreId}"
                     data-recurring="${chore.is_recurring || false}"
                     data-due="${chore.due_date}">
                    <div class="chore-title">${Team.escapeHtml(chore.title)}</div>
                    <div class="chore-time">${time}</div>
                </div>
            `;
        }).join('');
    },

    /**
     * Lighten a hex color
     */
    lightenColor(hex, factor) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse RGB values
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Lighten
        const newR = Math.round(r + (255 - r) * factor);
        const newG = Math.round(g + (255 - g) * factor);
        const newB = Math.round(b + (255 - b) * factor);

        // Convert back to hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    },

    /**
     * Format date for display (short format)
     */
    formatDateShort(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
};
