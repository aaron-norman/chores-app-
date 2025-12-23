/**
 * App - Main application controller
 */
const App = {
    currentView: 'calendar',

    /**
     * Initialize the application
     */
    init() {
        // Initialize storage
        Storage.init();

        // Initialize modules
        Team.init();
        Calendar.init();
        Chores.init();

        // Set up navigation
        this.initNavigation();

        // Set up modal
        this.initModal();

        // Set up export/import
        this.initExportImport();

        console.log('Office Chores app initialized');
    },

    /**
     * Initialize navigation
     */
    initNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);

                // Update active state
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    },

    /**
     * Switch between views
     */
    switchView(view) {
        this.currentView = view;

        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

        // Show selected view
        document.getElementById(`${view}-view`).classList.remove('hidden');

        // Refresh view content
        switch (view) {
            case 'calendar':
                Calendar.render();
                break;
            case 'chores':
                Chores.renderChoresList();
                break;
            case 'history':
                Chores.renderHistory();
                break;
        }
    },

    /**
     * Initialize modal functionality
     */
    initModal() {
        const overlay = document.getElementById('modal-overlay');
        const closeBtn = document.getElementById('modal-close');

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        });

        // Close button
        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    },

    /**
     * Show modal with content
     */
    showModal(title, content) {
        const overlay = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = title;
        modalBody.innerHTML = '';

        if (typeof content === 'string') {
            modalBody.innerHTML = content;
        } else {
            modalBody.appendChild(content);
        }

        overlay.classList.remove('hidden');
    },

    /**
     * Close modal
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.add('hidden');
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Initialize export/import functionality
     */
    initExportImport() {
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');

        exportBtn.addEventListener('click', () => {
            this.exportData();
        });

        importBtn.addEventListener('click', () => {
            importFile.click();
        });

        importFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importData(e.target.files[0]);
                e.target.value = ''; // Reset file input
            }
        });
    },

    /**
     * Export data to JSON file
     */
    exportData() {
        const data = Storage.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `chores-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Data exported successfully', 'success');
    },

    /**
     * Import data from JSON file
     */
    importData(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (confirm('This will replace all existing data. Continue?')) {
                    if (Storage.importData(data)) {
                        this.showToast('Data imported successfully', 'success');

                        // Refresh all views
                        Team.renderTeamList();
                        Team.populateAssigneeDropdowns();
                        Calendar.render();
                        Chores.renderChoresList();
                        Chores.renderHistory();
                    } else {
                        this.showToast('Failed to import data', 'error');
                    }
                }
            } catch (err) {
                console.error('Import error:', err);
                this.showToast('Invalid file format', 'error');
            }
        };

        reader.readAsText(file);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
