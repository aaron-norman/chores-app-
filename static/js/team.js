/**
 * Team - Team member management module
 */
const Team = {
    /**
     * Render the team members list in the sidebar
     */
    renderTeamList() {
        const teamList = document.getElementById('team-list');
        const members = Storage.getTeamMembers();

        if (members.length === 0) {
            teamList.innerHTML = '<li class="empty-state">No team members yet. Click + to add.</li>';
            return;
        }

        teamList.innerHTML = members.map(member => `
            <li class="team-member" data-id="${member.id}">
                <span class="member-color" style="background-color: ${member.color}"></span>
                <span class="member-name">${this.escapeHtml(member.name)}</span>
                <div class="member-actions">
                    <button class="btn-icon btn-edit" data-id="${member.id}" title="Edit">&#9998;</button>
                    <button class="btn-icon btn-delete" data-id="${member.id}" title="Delete">&times;</button>
                </div>
            </li>
        `).join('');

        // Attach event listeners
        teamList.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditMemberForm(btn.dataset.id);
            });
        });

        teamList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteMember(btn.dataset.id);
            });
        });
    },

    /**
     * Populate assignee dropdowns with team members
     */
    populateAssigneeDropdowns() {
        const members = Storage.getTeamMembers();
        const dropdowns = document.querySelectorAll('#chore-assignee, #filter-assignee');

        dropdowns.forEach(dropdown => {
            const currentValue = dropdown.value;
            const isFilter = dropdown.id === 'filter-assignee';

            dropdown.innerHTML = isFilter
                ? '<option value="">All Members</option>'
                : '<option value="">Unassigned</option>';

            members.forEach(member => {
                dropdown.innerHTML += `<option value="${member.id}">${this.escapeHtml(member.name)}</option>`;
            });

            // Restore previous selection if still valid
            if (currentValue && members.some(m => m.id === currentValue)) {
                dropdown.value = currentValue;
            }
        });
    },

    /**
     * Show the add member form in a modal
     */
    showAddMemberForm() {
        const template = document.getElementById('member-form-template');
        const content = template.content.cloneNode(true);

        App.showModal('Add Team Member', content);

        const form = document.getElementById('member-form');
        const cancelBtn = document.getElementById('cancel-member');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMemberFormSubmit(form);
        });

        cancelBtn.addEventListener('click', () => {
            App.closeModal();
        });

        document.getElementById('member-name').focus();
    },

    /**
     * Show the edit member form in a modal
     */
    showEditMemberForm(memberId) {
        const member = Storage.getTeamMemberById(memberId);
        if (!member) return;

        const template = document.getElementById('member-form-template');
        const content = template.content.cloneNode(true);

        App.showModal('Edit Team Member', content);

        // Populate form with existing data
        document.getElementById('member-id').value = member.id;
        document.getElementById('member-name').value = member.name;
        document.getElementById('member-color').value = member.color;

        const form = document.getElementById('member-form');
        const cancelBtn = document.getElementById('cancel-member');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMemberFormSubmit(form);
        });

        cancelBtn.addEventListener('click', () => {
            App.closeModal();
        });

        document.getElementById('member-name').focus();
    },

    /**
     * Handle member form submission (add or edit)
     */
    handleMemberFormSubmit(form) {
        const formData = new FormData(form);
        const id = formData.get('id');
        const name = formData.get('name').trim();
        const color = formData.get('color');

        if (!name) {
            App.showToast('Please enter a name', 'error');
            return;
        }

        if (id) {
            // Update existing member
            Storage.updateTeamMember(id, { name, color });
            App.showToast('Team member updated', 'success');
        } else {
            // Add new member
            Storage.addTeamMember({ name, color });
            App.showToast('Team member added', 'success');
        }

        App.closeModal();
        this.renderTeamList();
        this.populateAssigneeDropdowns();
        Calendar.render(); // Re-render calendar to update colors
    },

    /**
     * Confirm and delete a team member
     */
    confirmDeleteMember(memberId) {
        const member = Storage.getTeamMemberById(memberId);
        if (!member) return;

        if (confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
            Storage.deleteTeamMember(memberId);
            App.showToast('Team member removed', 'success');
            this.renderTeamList();
            this.populateAssigneeDropdowns();
            Calendar.render();
        }
    },

    /**
     * Get display name for a member ID
     */
    getMemberName(memberId) {
        if (!memberId) return 'Unassigned';
        const member = Storage.getTeamMemberById(memberId);
        return member ? member.name : 'Unknown';
    },

    /**
     * Get color for a member ID
     */
    getMemberColor(memberId) {
        if (!memberId) return '#999999';
        const member = Storage.getTeamMemberById(memberId);
        return member ? member.color : '#999999';
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Initialize team module
     */
    init() {
        // Add member button
        document.getElementById('add-member-btn').addEventListener('click', () => {
            this.showAddMemberForm();
        });

        this.renderTeamList();
        this.populateAssigneeDropdowns();
    }
};
