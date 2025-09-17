/**
 * Period Management System
 * ระบบจัดการคาบเรียน
 * 
 * Features:
 * - Add/Edit/Delete periods
 * - Time validation
 * - Search and sort periods
 * - Export to Excel
 * - Bulk operations
 */

class PeriodManagement {
    constructor() {
        this.periods = [];
        this.currentPage = 1;
        this.periodsPerPage = 10;
        this.searchQuery = '';
        this.sortColumn = 'period_no';
        this.sortDirection = 'asc';
        
        this.initializeEventListeners();
        this.loadPeriods();
    }

    /**
     * Initialize all event listeners for period management
     */
    initializeEventListeners() {
        // Form submission
        const periodForm = document.getElementById('period-form');
        if (periodForm) {
            periodForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Clear form
        const clearButton = document.getElementById('clear-period-form');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearForm());
        }

        // Search functionality
        const searchInput = document.getElementById('period-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Refresh button
        const refreshButton = document.getElementById('refresh-periods');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.loadPeriods());
        }

        // Items per page
        const itemsSelect = document.getElementById('periods-per-page');
        if (itemsSelect) {
            itemsSelect.addEventListener('change', (e) => {
                this.periodsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.renderTable();
            });
        }

        // Export button
        const exportButton = document.getElementById('export-periods');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportToExcel());
        }

        // Bulk actions
        const selectAllCheckbox = document.getElementById('select-all-periods');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.handleSelectAll(e.target.checked));
        }

        const deleteSelectedButton = document.getElementById('delete-selected-periods');
        if (deleteSelectedButton) {
            deleteSelectedButton.addEventListener('click', () => this.handleBulkDelete());
        }

        // Pagination
        const prevButton = document.getElementById('prev-period-page');
        const nextButton = document.getElementById('next-period-page');
        
        if (prevButton) {
            prevButton.addEventListener('click', () => this.goToPreviousPage());
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => this.goToNextPage());
        }

        // Table sorting
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-sortable]')) {
                const column = e.target.getAttribute('data-column');
                this.handleSort(column);
            }
        });

        // Time validation
        const startTimeInput = document.getElementById('period-start-time');
        const endTimeInput = document.getElementById('period-end-time');
        
        if (startTimeInput && endTimeInput) {
            startTimeInput.addEventListener('change', () => this.validateTimeInputs());
            endTimeInput.addEventListener('change', () => this.validateTimeInputs());
        }
    }

    /**
     * Validate start and end time inputs
     */
    validateTimeInputs() {
        const startTime = document.getElementById('period-start-time').value;
        const endTime = document.getElementById('period-end-time').value;
        const endTimeInput = document.getElementById('period-end-time');

        if (startTime && endTime) {
            if (startTime >= endTime) {
                endTimeInput.setCustomValidity('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม');
                endTimeInput.reportValidity();
                return false;
            } else {
                endTimeInput.setCustomValidity('');
            }
        }
        return true;
    }

    /**
     * Calculate duration between start and end time
     */
    calculateDuration(startTime, endTime) {
        const start = new Date(`1970-01-01T${startTime}`);
        const end = new Date(`1970-01-01T${endTime}`);
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const minutes = diffMins % 60;
        
        if (hours > 0) {
            return minutes > 0 ? `${hours} ชม. ${minutes} นาที` : `${hours} ชั่วโมง`;
        } else {
            return `${minutes} นาที`;
        }
    }

    /**
     * Handle form submission for adding/editing periods
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateTimeInputs()) {
            return;
        }

        const formData = new FormData(e.target);
        const periodData = {
            period_no: parseInt(formData.get('period_no')),
            period_name: formData.get('period_name').trim(),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time')
        };

        // Check for duplicate period number
        const existingPeriod = this.periods.find(p => 
            p.period_no === periodData.period_no && 
            (!this.editingId || p.period_no !== this.editingId)
        );

        if (existingPeriod) {
            this.showError('มีคาบที่ ' + periodData.period_no + ' อยู่แล้ว');
            return;
        }

        try {
            if (this.editingId) {
                await this.updatePeriod(this.editingId, periodData);
                this.showSuccess('แก้ไขคาบเรียนสำเร็จ');
            } else {
                await this.addPeriod(periodData);
                this.showSuccess('เพิ่มคาบเรียนสำเร็จ');
            }
            
            this.clearForm();
            this.loadPeriods();
        } catch (error) {
            console.error('Error saving period:', error);
            this.showError('เกิดข้อผิดพลาด: ' + error.message);
        }
    }

    /**
     * Add new period to database
     */
    async addPeriod(periodData) {
        const response = await fetch('/api/periods', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(periodData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add period');
        }

        return await response.json();
    }

    /**
     * Update existing period in database
     */
    async updatePeriod(periodNo, periodData) {
        const response = await fetch(`/api/periods/${periodNo}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(periodData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update period');
        }

        return await response.json();
    }

    /**
     * Load periods from database
     */
    async loadPeriods() {
        try {
            this.showLoading();
            const response = await fetch('/api/periods');
            
            if (!response.ok) {
                throw new Error('Failed to load periods');
            }

            this.periods = await response.json();
            this.renderTable();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading periods:', error);
            this.showError('ไม่สามารถโหลดข้อมูลคาบเรียนได้');
            this.hideLoading();
        }
    }

    /**
     * Delete period from database
     */
    async deletePeriod(periodNo) {
        const response = await fetch(`/api/periods/${periodNo}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete period');
        }

        return await response.json();
    }

    /**
     * Handle search functionality
     */
    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.currentPage = 1;
        this.renderTable();
    }

    /**
     * Handle table sorting
     */
    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.renderTable();
    }

    /**
     * Filter and sort periods based on current criteria
     */
    getFilteredAndSortedPeriods() {
        let filtered = [...this.periods];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(period =>
                period.period_name.toLowerCase().includes(this.searchQuery) ||
                period.period_no.toString().includes(this.searchQuery) ||
                period.start_time.includes(this.searchQuery) ||
                period.end_time.includes(this.searchQuery)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[this.sortColumn];
            let bValue = b[this.sortColumn];

            // Handle numeric sorting for period_no
            if (this.sortColumn === 'period_no') {
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
            }

            if (this.sortDirection === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return filtered;
    }

    /**
     * Render periods table
     */
    renderTable() {
        const tbody = document.getElementById('periods-table-body');
        const filtered = this.getFilteredAndSortedPeriods();
        
        // Calculate pagination
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / this.periodsPerPage);
        const startIndex = (this.currentPage - 1) * this.periodsPerPage;
        const endIndex = Math.min(startIndex + this.periodsPerPage, totalItems);
        const pageItems = filtered.slice(startIndex, endIndex);

        // Render table rows
        if (pageItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">
                        ${this.searchQuery ? '🔍 ไม่พบข้อมูลที่ค้นหา' : '📭 ยังไม่มีข้อมูลคาบเรียน'}
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = pageItems.map(period => this.renderPeriodRow(period)).join('');
        }

        // Update pagination info
        this.updatePaginationInfo(this.currentPage, totalPages, totalItems);

        // Update sorting indicators
        this.updateSortingIndicators();

        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-periods');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }

        // Update bulk action buttons
        this.updateBulkActionButtons();
    }

    /**
     * Render individual period row
     */
    renderPeriodRow(period) {
        const duration = this.calculateDuration(period.start_time, period.end_time);
        
        return `
            <tr data-period-no="${period.period_no}">
                <td class="col-checkbox">
                    <input type="checkbox" class="period-checkbox" value="${period.period_no}">
                </td>
                <td class="col-period-no">
                    <span class="period-no-badge">${period.period_no}</span>
                </td>
                <td class="col-period-name">${this.escapeHtml(period.period_name)}</td>
                <td class="col-start-time">${period.start_time}</td>
                <td class="col-end-time">${period.end_time}</td>
                <td class="col-duration">
                    <span class="duration-badge">${duration}</span>
                </td>
                <td class="col-actions">
                    <div class="action-buttons">
                        <button type="button" class="btn btn--sm btn--ghost" 
                                onclick="periodManager.editPeriod(${period.period_no})"
                                title="แก้ไข">
                            ✏️
                        </button>
                        <button type="button" class="btn btn--sm btn--ghost" 
                                onclick="periodManager.deletePeriodConfirm(${period.period_no})"
                                title="ลบ">
                            🗑️
                        </button>
                        <button type="button" class="btn btn--sm btn--ghost" 
                                onclick="periodManager.viewPeriodDetails(${period.period_no})"
                                title="ดูรายละเอียด">
                            👁️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Edit period - populate form with existing data
     */
    editPeriod(periodNo) {
        const period = this.periods.find(p => p.period_no === periodNo);
        if (!period) return;

        document.getElementById('period-no').value = period.period_no;
        document.getElementById('period-name').value = period.period_name;
        document.getElementById('period-start-time').value = period.start_time;
        document.getElementById('period-end-time').value = period.end_time;

        // Make period_no readonly during edit
        document.getElementById('period-no').setAttribute('readonly', true);
        
        // Update form title and button
        const formTitle = document.querySelector('.admin-form-section h3');
        if (formTitle) {
            formTitle.innerHTML = '✏️ แก้ไขคาบเรียน';
        }

        const submitButton = document.querySelector('#period-form button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = '💾 บันทึกการแก้ไข';
        }

        this.editingId = periodNo;
        
        // Scroll to form
        document.querySelector('.admin-form-section').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }

    /**
     * Delete period with confirmation
     */
    async deletePeriodConfirm(periodNo) {
        const period = this.periods.find(p => p.period_no === periodNo);
        if (!period) return;

        const confirmed = confirm(
            `คุณต้องการลบคาบเรียน "${period.period_name}" (คาบที่ ${period.period_no}) หรือไม่?\n\n` +
            `⚠️ การลบนี้ไม่สามารถย้อนกลับได้`
        );

        if (confirmed) {
            try {
                await this.deletePeriod(periodNo);
                this.showSuccess('ลบคาบเรียนสำเร็จ');
                this.loadPeriods();
            } catch (error) {
                console.error('Error deleting period:', error);
                this.showError('เกิดข้อผิดพลาดในการลบคาบเรียน');
            }
        }
    }

    /**
     * View period details in modal
     */
    viewPeriodDetails(periodNo) {
        const period = this.periods.find(p => p.period_no === periodNo);
        if (!period) return;

        const duration = this.calculateDuration(period.start_time, period.end_time);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔍 รายละเอียดคาบเรียน</h3>
                    <button type="button" class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>ลำดับคาบ:</label>
                            <span class="period-no-badge">${period.period_no}</span>
                        </div>
                        <div class="detail-item">
                            <label>ชื่อคาบ:</label>
                            <span>${this.escapeHtml(period.period_name)}</span>
                        </div>
                        <div class="detail-item">
                            <label>เวลาเริ่ม:</label>
                            <span>${period.start_time}</span>
                        </div>
                        <div class="detail-item">
                            <label>เวลาสิ้นสุด:</label>
                            <span>${period.end_time}</span>
                        </div>
                        <div class="detail-item">
                            <label>ระยะเวลา:</label>
                            <span class="duration-badge">${duration}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn--outline" onclick="this.closest('.modal-overlay').remove()">ปิด</button>
                    <button type="button" class="btn btn--primary" onclick="periodManager.editPeriod(${period.period_no}); this.closest('.modal-overlay').remove();">แก้ไข</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Clear form and reset to add mode
     */
    clearForm() {
        const form = document.getElementById('period-form');
        if (form) {
            form.reset();
        }

        // Remove readonly attribute from period_no
        const periodNoInput = document.getElementById('period-no');
        if (periodNoInput) {
            periodNoInput.removeAttribute('readonly');
        }

        // Reset form title and button
        const formTitle = document.querySelector('.admin-form-section h3');
        if (formTitle) {
            formTitle.innerHTML = '📝 เพิ่มคาบเรียนใหม่';
        }

        const submitButton = document.querySelector('#period-form button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = '💾 บันทึก';
        }

        this.editingId = null;
    }

    /**
     * Handle select all functionality
     */
    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.period-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBulkActionButtons();
    }

    /**
     * Handle bulk delete operation
     */
    async handleBulkDelete() {
        const selectedPeriods = this.getSelectedPeriods();
        if (selectedPeriods.length === 0) {
            this.showError('กรุณาเลือกคาบเรียนที่ต้องการลบ');
            return;
        }

        const confirmed = confirm(
            `คุณต้องการลบคาบเรียน ${selectedPeriods.length} รายการที่เลือก หรือไม่?\n\n` +
            `⚠️ การลบนี้ไม่สามารถย้อนกลับได้`
        );

        if (confirmed) {
            try {
                const deletePromises = selectedPeriods.map(periodNo => this.deletePeriod(periodNo));
                await Promise.all(deletePromises);
                
                this.showSuccess(`ลบคาบเรียน ${selectedPeriods.length} รายการสำเร็จ`);
                this.loadPeriods();
            } catch (error) {
                console.error('Error bulk deleting periods:', error);
                this.showError('เกิดข้อผิดพลาดในการลบคาบเรียน');
            }
        }
    }

    /**
     * Get selected period numbers
     */
    getSelectedPeriods() {
        const checkboxes = document.querySelectorAll('.period-checkbox:checked');
        return Array.from(checkboxes).map(checkbox => parseInt(checkbox.value));
    }

    /**
     * Update bulk action button states
     */
    updateBulkActionButtons() {
        const selectedCount = document.querySelectorAll('.period-checkbox:checked').length;
        const deleteButton = document.getElementById('delete-selected-periods');
        const copyButton = document.getElementById('copy-selected-periods');

        if (deleteButton) {
            deleteButton.disabled = selectedCount === 0;
        }
        if (copyButton) {
            copyButton.disabled = selectedCount === 0;
        }
    }

    /**
     * Update pagination information
     */
    updatePaginationInfo(currentPage, totalPages, totalItems) {
        const pageInfo = document.querySelector('#periods-pagination .page-info');
        if (pageInfo) {
            pageInfo.textContent = `หน้า ${currentPage} จาก ${totalPages} (${totalItems} รายการ)`;
        }

        const prevButton = document.getElementById('prev-period-page');
        const nextButton = document.getElementById('next-period-page');

        if (prevButton) {
            prevButton.disabled = currentPage <= 1;
        }
        if (nextButton) {
            nextButton.disabled = currentPage >= totalPages;
        }
    }

    /**
     * Update sorting indicators in table headers
     */
    updateSortingIndicators() {
        // Remove existing sort indicators
        document.querySelectorAll('[data-sortable]').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        // Add current sort indicator
        const currentHeader = document.querySelector(`[data-column="${this.sortColumn}"]`);
        if (currentHeader) {
            currentHeader.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }

    /**
     * Navigate to previous page
     */
    goToPreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    }

    /**
     * Navigate to next page
     */
    goToNextPage() {
        const totalPages = Math.ceil(this.getFilteredAndSortedPeriods().length / this.periodsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    }

    /**
     * Export periods to Excel
     */
    exportToExcel() {
        const data = this.getFilteredAndSortedPeriods();
        
        if (data.length === 0) {
            this.showError('ไม่มีข้อมูลที่จะส่งออก');
            return;
        }

        try {
            // Prepare data for export
            const exportData = data.map(period => ({
                'ลำดับคาบ': period.period_no,
                'ชื่อคาบ': period.period_name,
                'เวลาเริ่ม': period.start_time,
                'เวลาสิ้นสุด': period.end_time,
                'ระยะเวลา': this.calculateDuration(period.start_time, period.end_time)
            }));

            // Convert to CSV format
            const csvContent = this.convertToCSV(exportData);
            
            // Download file
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `periods_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showSuccess('ส่งออกข้อมูลคาบเรียนสำเร็จ');
        } catch (error) {
            console.error('Error exporting periods:', error);
            this.showError('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header] || '';
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }

    /**
     * Show loading state
     */
    showLoading() {
        const tbody = document.getElementById('periods-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-message">
                        🔄 กำลังโหลดข้อมูล...
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        // Loading is hidden when renderTable is called
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // You can implement a toast notification system here
        console.log('SUCCESS:', message);
        alert(message); // Temporary solution
    }

    /**
     * Show error message
     */
    showError(message) {
        // You can implement a toast notification system here
        console.error('ERROR:', message);
        alert(message); // Temporary solution
    }

    /**
     * Escape HTML to prevent XSS attacks
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize period management when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the admin page and the period form exists
    if (document.getElementById('period-form')) {
        window.periodManager = new PeriodManagement();
    }
});

// Make it globally accessible
window.PeriodManagement = PeriodManagement;
