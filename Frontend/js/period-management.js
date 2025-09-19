import scheduleAPI from './api/schedule-api.js';
import { getContext as getGlobalContext } from './context/globalContext.js';

class PeriodManagement {
    constructor() {
        this.periods = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchQuery = '';
        this.sortColumn = 'period_no';
        this.sortDirection = 'asc';
        this.editingPeriod = null;

        this.initializeEventListeners();
        this.loadPeriods();
    }

    initializeEventListeners() {
        const periodForm = document.getElementById('period-form');
        if (periodForm) {
            periodForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        const clearButton = document.getElementById('clear-period-form');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearForm());
        }

        const searchInput = document.getElementById('period-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        const refreshButton = document.getElementById('refresh-periods');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.loadPeriods());
        }

        const itemsSelect = document.getElementById('periods-per-page');
        if (itemsSelect) {
            itemsSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value, 10) || 10;
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const exportButton = document.getElementById('export-periods');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportToCSV());
        }

        const selectAllCheckbox = document.getElementById('select-all-periods');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }

        const deleteSelectedButton = document.getElementById('delete-selected-periods');
        if (deleteSelectedButton) {
            deleteSelectedButton.addEventListener('click', () => this.handleBulkDelete());
        }

        const prevButton = document.getElementById('prev-period-page');
        if (prevButton) {
            prevButton.addEventListener('click', () => this.changePage(this.currentPage - 1));
        }

        const nextButton = document.getElementById('next-period-page');
        if (nextButton) {
            nextButton.addEventListener('click', () => this.changePage(this.currentPage + 1));
        }

        const periodsTable = document.getElementById('periods-table');
        if (periodsTable) {
            periodsTable.addEventListener('click', (event) => {
                const target = event.target;
                if (target.matches('[data-sortable]')) {
                    this.handleSort(target.dataset.column);
                    return;
                }
                if (target.matches('[data-action="edit"]')) {
                    this.editPeriod(parseInt(target.dataset.periodId, 10));
                    return;
                }
                if (target.matches('[data-action="delete"]')) {
                    this.deletePeriodConfirm(parseInt(target.dataset.periodId, 10));
                }
            });
        }
    }

    getActiveContext() {
        const sources = [
            window.adminState?.context,
            typeof getGlobalContext === 'function' ? getGlobalContext() : null,
            window.globalAcademicContext
        ];

        let year;
        let semesterId;

        for (const src of sources) {
            if (!src) continue;
            if (src.year) year = src.year;
            if (src.currentYear) year = src.currentYear;
            if (src.academic_year?.year) year = src.academic_year.year;

            if (src.semesterId) semesterId = src.semesterId;
            if (src.semester?.id) semesterId = src.semester.id;
            if (src.currentSemester?.id) semesterId = src.currentSemester.id;
        }

        if (!year) {
            year = new Date().getFullYear() + 543;
        }

        return {
            year: parseInt(year, 10),
            semesterId: semesterId ? parseInt(semesterId, 10) : null
        };
    }

    async loadPeriods() {
        try {
            this.showLoading();
            const context = this.getActiveContext();
            if (!context.semesterId) {
                throw new Error('ไม่พบภาคเรียนที่ใช้งานอยู่');
            }

            const result = await scheduleAPI.getPeriods(context.year, context.semesterId);
            if (!result.success) {
                throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลคาบเรียนได้');
            }

            this.periods = result.data || [];
            this.currentPage = 1;
            this.renderTable();
        } catch (error) {
            console.error('Error loading periods:', error);
            this.showError('ไม่สามารถโหลดข้อมูลคาบเรียนได้ กรุณาลองใหม่');
        }
    }

    getFilteredAndSortedPeriods() {
        let data = [...this.periods];

        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            data = data.filter(period =>
                `${period.period_no}`.includes(query) ||
                (period.period_name || '').toLowerCase().includes(query)
            );
        }

        data.sort((a, b) => {
            const dir = this.sortDirection === 'asc' ? 1 : -1;
            if (this.sortColumn === 'period_no') {
                return (a.period_no - b.period_no) * dir;
            }
            const aValue = (a[this.sortColumn] || '').toString().toLowerCase();
            const bValue = (b[this.sortColumn] || '').toString().toLowerCase();
            if (aValue < bValue) return -1 * dir;
            if (aValue > bValue) return 1 * dir;
            return 0;
        });

        return data;
    }

    renderTable() {
        const tbody = document.getElementById('periods-table-body');
        if (!tbody) return;

        const data = this.getFilteredAndSortedPeriods();
        const totalItems = data.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / this.itemsPerPage));

        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const currentItems = data.slice(startIndex, startIndex + this.itemsPerPage);

        if (currentItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">📋 ยังไม่มีข้อมูลคาบเรียน</td>
                </tr>
            `;
            this.updatePaginationInfo(totalItems, totalPages);
            return;
        }

        tbody.innerHTML = currentItems.map(period => `
            <tr>
                <td>
                    <input type="checkbox" class="period-checkbox" data-period-id="${period.id}">
                </td>
                <td>${period.period_no}</td>
                <td>${this.escapeHtml(period.period_name || '')}</td>
                <td>${period.start_time}</td>
                <td>${period.end_time}</td>
                <td>${this.formatDuration(period.start_time, period.end_time)}</td>
                <td class="actions">
                    <button type="button" class="btn btn--sm btn--outline" data-action="edit" data-period-id="${period.id}">✏️</button>
                    <button type="button" class="btn btn--sm btn--danger" data-action="delete" data-period-id="${period.id}">🗑️</button>
                </td>
            </tr>
        `).join('');

        const selectAllCheckbox = document.getElementById('select-all-periods');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }

        tbody.querySelectorAll('.period-checkbox').forEach(cb => {
            cb.addEventListener('change', () => this.updateBulkActionState());
        });

        this.updateBulkActionState();
        this.updatePaginationInfo(totalItems, totalPages);
    }

    updatePaginationInfo(totalItems, totalPages) {
        const pageInfo = document.getElementById('period-page-info');
        if (pageInfo) {
            pageInfo.textContent = `หน้า ${this.currentPage} จาก ${totalPages} (${totalItems} รายการ)`;
        }

        const prevButton = document.getElementById('prev-period-page');
        const nextButton = document.getElementById('next-period-page');
        if (prevButton) prevButton.disabled = this.currentPage <= 1;
        if (nextButton) nextButton.disabled = this.currentPage >= totalPages;
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.currentPage = 1;
        this.renderTable();
    }

    handleSort(column) {
        if (!column) return;
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.renderTable();
    }

    changePage(newPage) {
        const data = this.getFilteredAndSortedPeriods();
        const totalPages = Math.max(1, Math.ceil(data.length / this.itemsPerPage));
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderTable();
        }
    }

    toggleSelectAll(isChecked) {
        document.querySelectorAll('.period-checkbox').forEach(cb => {
            cb.checked = isChecked;
        });
        this.updateBulkActionState();
    }

    getSelectedPeriodIds() {
        return Array.from(document.querySelectorAll('.period-checkbox:checked'))
            .map(cb => parseInt(cb.dataset.periodId, 10))
            .filter(id => !isNaN(id));
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const periodNo = parseInt(form.period_no.value, 10);
        const periodName = form.period_name.value.trim();
        const startTime = form.start_time.value;
        const endTime = form.end_time.value;

        if (!Number.isInteger(periodNo) || periodNo <= 0) {
            this.showError('หมายเลขคาบต้องเป็นจำนวนเต็มบวก');
            return;
        }
        if (!periodName) {
            this.showError('กรุณากรอกชื่อคาบ');
            return;
        }
        if (!this.validateTimeRange(startTime, endTime)) {
            return;
        }

        const context = this.getActiveContext();
        if (!context.semesterId) {
            this.showError('ไม่พบภาคเรียนที่ใช้งานอยู่');
            return;
        }

        const payload = {
            semester_id: context.semesterId,
            period_no: periodNo,
            period_name: periodName,
            start_time: startTime,
            end_time: endTime
        };

        try {
            let result;
            if (this.editingPeriod) {
                result = await scheduleAPI.updatePeriod(context.year, context.semesterId, this.editingPeriod.id, payload);
            } else {
                result = await scheduleAPI.createPeriod(context.year, context.semesterId, payload);
            }

            if (!result.success) {
                throw new Error(result.error || 'ไม่สามารถบันทึกข้อมูลคาบเรียนได้');
            }

            this.showSuccess(this.editingPeriod ? 'อัปเดตคาบเรียนสำเร็จ' : 'เพิ่มคาบเรียนใหม่สำเร็จ');
            this.clearForm();
            await this.loadPeriods();
        } catch (error) {
            console.error('Error saving period:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการบันทึกคาบเรียน');
        }
    }

    validateTimeRange(startTime, endTime) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            this.showError('รูปแบบเวลาต้องเป็น HH:MM');
            return false;
        }
        if (startTime >= endTime) {
            this.showError('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด');
            return false;
        }
        return true;
    }

    clearForm() {
        const form = document.getElementById('period-form');
        if (form) {
            form.reset();
        }
        this.editingPeriod = null;
        const heading = form?.closest('.admin-form-section')?.querySelector('h3');
        if (heading) {
            heading.textContent = '📝 เพิ่มคาบเรียนใหม่';
        }
    }

    editPeriod(periodId) {
        const period = this.periods.find(p => p.id === periodId);
        if (!period) return;

        const form = document.getElementById('period-form');
        if (!form) return;

        form.period_no.value = period.period_no;
        form.period_name.value = period.period_name || '';
        form.start_time.value = period.start_time;
        form.end_time.value = period.end_time;

        this.editingPeriod = period;

        const heading = form.closest('.admin-form-section')?.querySelector('h3');
        if (heading) {
            heading.textContent = `✏️ แก้ไขคาบ ${period.period_no}`;
        }
    }

    async deletePeriodConfirm(periodId) {
        const period = this.periods.find(p => p.id === periodId);
        if (!period) return;

        const confirmed = confirm(
            `คุณต้องการลบคาบเรียน "${period.period_name}" (คาบที่ ${period.period_no}) หรือไม่?\n\nการลบนี้ไม่สามารถย้อนกลับได้`
        );

        if (!confirmed) return;

        await this.deletePeriod(periodId);
    }

    async deletePeriod(periodId) {
        try {
            const context = this.getActiveContext();
            if (!context.semesterId) {
                throw new Error('ไม่พบภาคเรียนที่ใช้งานอยู่');
            }

            const result = await scheduleAPI.deletePeriod(context.year, context.semesterId, periodId);
            if (!result.success) {
                throw new Error(result.error || 'ไม่สามารถลบคาบเรียนได้');
            }

            if (this.editingPeriod && this.editingPeriod.id === periodId) {
                this.clearForm();
            }

            this.showSuccess('ลบคาบเรียนสำเร็จ');
            await this.loadPeriods();
        } catch (error) {
            console.error('Error deleting period:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการลบคาบเรียน');
        }
    }

    async handleBulkDelete() {
        const selectedIds = this.getSelectedPeriodIds();
        if (selectedIds.length === 0) {
            this.showError('กรุณาเลือกคาบเรียนที่ต้องการลบ');
            return;
        }

        const confirmed = confirm(`คุณต้องการลบคาบเรียนที่เลือกจำนวน ${selectedIds.length} รายการหรือไม่?`);
        if (!confirmed) return;

        try {
            for (const id of selectedIds) {
                await this.deletePeriod(id);
            }
            this.showSuccess(`ลบคาบเรียน ${selectedIds.length} รายการสำเร็จ`);
            await this.loadPeriods();
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showError('เกิดข้อผิดพลาดในการลบคาบเรียนที่เลือก');
        }
    }

    updateBulkActionState() {
        const selectedIds = this.getSelectedPeriodIds();
        const deleteButton = document.getElementById('delete-selected-periods');
        if (deleteButton) {
            deleteButton.disabled = selectedIds.length === 0;
        }
        const copyButton = document.getElementById('copy-selected-periods');
        if (copyButton) {
            copyButton.disabled = true;
        }
    }

    exportToCSV() {
        const data = this.getFilteredAndSortedPeriods();
        if (data.length === 0) {
            this.showError('ไม่มีข้อมูลที่จะส่งออก');
            return;
        }

        const rows = data.map(item => ({
            'คาบ': item.period_no,
            'ชื่อคาบ': item.period_name,
            'เวลาเริ่ม': item.start_time,
            'เวลาสิ้นสุด': item.end_time,
            'ระยะเวลา': this.formatDuration(item.start_time, item.end_time)
        }));

        const headers = Object.keys(rows[0]);
        const csvRows = [headers.join(',')];
        for (const row of rows) {
            csvRows.push(headers.map(h => this.escapeCSV(row[h])).join(','));
        }

        const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `periods_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showSuccess('ส่งออกข้อมูลคาบเรียนสำเร็จ');
    }

    formatDuration(start, end) {
        if (!start || !end) return '-';
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        const diff = endMinutes - startMinutes;
        if (diff <= 0) return '-';
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        if (hours === 0) return `${minutes} นาที`;
        if (minutes === 0) return `${hours} ชั่วโมง`;
        return `${hours} ชม. ${minutes} นาที`;
    }

    formatTimeRange(period) {
        return `${period.start_time} - ${period.end_time}`;
    }

    changeEditingHeader(text) {
        const form = document.getElementById('period-form');
        const heading = form?.closest('.admin-form-section')?.querySelector('h3');
        if (heading) heading.textContent = text;
    }

    showLoading() {
        const tbody = document.getElementById('periods-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-message">🔄 กำลังโหลดข้อมูล...</td>
                </tr>
            `;
        }
    }

    showSuccess(message) {
        console.log('SUCCESS:', message);
        alert(message);
    }

    showError(message) {
        console.error('ERROR:', message);
        alert(message);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeCSV(value) {
        if (value == null) return '';
        const str = value.toString();
        if (str.includes(',') || str.includes('\"')) {
            return `"${str.replace(/\"/g, '""')}"`;
        }
        return str;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('period-form')) {
        window.periodManager = new PeriodManagement();
    }
});

window.PeriodManagement = PeriodManagement;
