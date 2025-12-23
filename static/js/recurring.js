/**
 * Recurring - Cron expression handling for recurring chores
 */
const Recurring = {
    PRESETS: {
        'daily': {
            label: 'Daily',
            getCron: (time) => `${time.minute} ${time.hour} * * *`,
            description: 'Every day'
        },
        'weekly': {
            label: 'Weekly (same day)',
            getCron: (time, dayOfWeek) => `${time.minute} ${time.hour} * * ${dayOfWeek}`,
            description: 'Every week on the same day'
        },
        'weekdays': {
            label: 'Weekdays (Mon-Fri)',
            getCron: (time) => `${time.minute} ${time.hour} * * 1-5`,
            description: 'Every weekday'
        },
        'biweekly': {
            label: 'Every 2 weeks',
            getCron: (time, dayOfWeek) => `${time.minute} ${time.hour} * * ${dayOfWeek}`,
            description: 'Every 2 weeks',
            interval: 2
        },
        'monthly': {
            label: 'Monthly (same date)',
            getCron: (time, _, dayOfMonth) => `${time.minute} ${time.hour} ${dayOfMonth} * *`,
            description: 'Every month on the same date'
        },
        'first-weekday': {
            label: 'First [weekday] of month',
            getCron: (time, dayOfWeek) => `${time.minute} ${time.hour} 1-7 * ${dayOfWeek}`,
            description: 'First occurrence of this weekday each month'
        },
        'last-weekday': {
            label: 'Last [weekday] of month',
            getCron: (time, dayOfWeek) => `${time.minute} ${time.hour} * * ${dayOfWeek}L`,
            description: 'Last occurrence of this weekday each month',
            isLastWeekday: true
        },
        'custom': {
            label: 'Custom (cron expression)',
            getCron: (_, __, ___, customCron) => customCron,
            description: 'Custom cron expression'
        }
    },

    DAY_NAMES: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    DAY_NAMES_SHORT: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    /**
     * Parse time string to hour and minute
     */
    parseTime(timeStr) {
        const [hour, minute] = timeStr.split(':').map(Number);
        return { hour, minute };
    },

    /**
     * Generate cron expression from preset and parameters
     */
    generateCron(preset, time, referenceDate) {
        const timeObj = this.parseTime(time);
        const date = new Date(referenceDate);
        const dayOfWeek = date.getDay();
        const dayOfMonth = date.getDate();

        const presetConfig = this.PRESETS[preset];
        if (!presetConfig) return null;

        return presetConfig.getCron(timeObj, dayOfWeek, dayOfMonth);
    },

    /**
     * Get human-readable description of cron expression
     */
    getDescription(cronExpression) {
        try {
            // Use cronstrue library if available
            if (typeof cronstrue !== 'undefined') {
                return cronstrue.toString(cronExpression);
            }
            return cronExpression;
        } catch (e) {
            return cronExpression;
        }
    },

    /**
     * Calculate occurrences of a recurring chore within a date range
     */
    getOccurrences(recurrenceRule, startDate, endDate) {
        const occurrences = [];
        const cron = recurrenceRule.cron;
        const parts = cron.split(' ');

        if (parts.length !== 5) return occurrences;

        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
        const interval = recurrenceRule.interval || 1;

        // Iterate through each day in the range
        const current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        let intervalCount = 0;

        while (current <= end) {
            if (this.matchesCron(current, minute, hour, dayOfMonth, month, dayOfWeek)) {
                // Handle interval (for biweekly, etc.)
                if (interval === 1 || intervalCount % interval === 0) {
                    const occurrence = new Date(current);
                    occurrence.setHours(parseInt(hour), parseInt(minute), 0, 0);
                    occurrences.push(occurrence);
                }
                intervalCount++;
            }
            current.setDate(current.getDate() + 1);
        }

        return occurrences;
    },

    /**
     * Check if a date matches cron pattern
     */
    matchesCron(date, minute, hour, dayOfMonth, month, dayOfWeek) {
        // Check month
        if (month !== '*') {
            const months = this.parseField(month);
            if (!months.includes(date.getMonth() + 1)) return false;
        }

        // Check day of month
        if (dayOfMonth !== '*') {
            const days = this.parseField(dayOfMonth);
            if (!days.includes(date.getDate())) return false;
        }

        // Check day of week (handle 'L' for last weekday of month)
        if (dayOfWeek !== '*') {
            if (dayOfWeek.endsWith('L')) {
                // Last X of month
                const dow = parseInt(dayOfWeek);
                if (!this.isLastWeekdayOfMonth(date, dow)) return false;
            } else {
                const dows = this.parseField(dayOfWeek);
                if (!dows.includes(date.getDay())) return false;
            }
        }

        // For "first weekday of month" pattern (1-7 * dow)
        if (dayOfMonth === '1-7' && dayOfWeek !== '*') {
            const dow = this.parseField(dayOfWeek);
            if (!dow.includes(date.getDay())) return false;
            if (date.getDate() > 7) return false;
        }

        return true;
    },

    /**
     * Parse cron field (handles ranges, lists, wildcards)
     */
    parseField(field) {
        const values = [];

        // Handle comma-separated values
        const parts = field.split(',');

        for (const part of parts) {
            // Handle range (e.g., "1-5")
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    values.push(i);
                }
            } else {
                values.push(parseInt(part));
            }
        }

        return values;
    },

    /**
     * Check if date is the last occurrence of a weekday in the month
     */
    isLastWeekdayOfMonth(date, targetDow) {
        if (date.getDay() !== targetDow) return false;

        // Check if there's another occurrence of this weekday in the month
        const nextWeek = new Date(date);
        nextWeek.setDate(nextWeek.getDate() + 7);

        return nextWeek.getMonth() !== date.getMonth();
    },

    /**
     * Expand recurring chores for a given week
     */
    expandForWeek(weekStart) {
        const recurringChores = Storage.getRecurringChores();
        const expanded = [];

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        recurringChores.forEach(chore => {
            const occurrences = this.getOccurrences(chore.recurrence_rule, weekStart, weekEnd);

            occurrences.forEach(date => {
                expanded.push({
                    ...chore,
                    instance_id: `${chore.id}-${date.toISOString()}`,
                    original_id: chore.id,
                    due_date: date.toISOString(),
                    is_instance: true,
                    is_recurring: true
                });
            });
        });

        return expanded;
    },

    /**
     * Create recurrence rule object from form data
     */
    createRule(preset, time, referenceDate, customCron = null) {
        let cron;
        let interval = 1;

        if (preset === 'custom' && customCron) {
            cron = customCron;
        } else {
            cron = this.generateCron(preset, time, referenceDate);
            if (preset === 'biweekly') {
                interval = 2;
            }
        }

        return {
            cron: cron,
            preset: preset,
            human_readable: this.getDescription(cron),
            interval: interval,
            start_date: new Date().toISOString()
        };
    },

    /**
     * Preview next occurrences for a recurrence rule
     */
    previewOccurrences(rule, count = 5) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 3); // Look 3 months ahead

        const allOccurrences = this.getOccurrences(rule, now, futureDate);
        return allOccurrences.slice(0, count);
    },

    /**
     * Initialize recurring module event handlers
     */
    init() {
        // Handle preset change
        const presetSelect = document.getElementById('recurrence-preset');
        const customCronGroup = document.getElementById('custom-cron-group');
        const previewSpan = document.getElementById('recurrence-description');
        const timeInput = document.getElementById('recurrence-time');

        if (presetSelect) {
            const updatePreview = () => {
                const preset = presetSelect.value;
                const time = timeInput.value || '09:00';
                const referenceDate = document.getElementById('chore-due-date')?.value || new Date().toISOString();

                // Show/hide custom cron input
                if (preset === 'custom') {
                    customCronGroup.classList.remove('hidden');
                } else {
                    customCronGroup.classList.add('hidden');
                }

                // Generate preview
                try {
                    const customCron = document.getElementById('custom-cron')?.value;
                    const rule = this.createRule(preset, time, referenceDate, customCron);
                    const nextOccurrences = this.previewOccurrences(rule, 3);

                    let previewText = rule.human_readable;
                    if (nextOccurrences.length > 0) {
                        previewText += '<br>Next: ' + nextOccurrences.map(d =>
                            d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                        ).join(', ');
                    }
                    previewSpan.innerHTML = previewText;
                } catch (e) {
                    previewSpan.textContent = 'Invalid configuration';
                }
            };

            presetSelect.addEventListener('change', updatePreview);
            timeInput?.addEventListener('change', updatePreview);
            document.getElementById('custom-cron')?.addEventListener('input', updatePreview);
        }
    }
};
