import { exportTableToCSV, exportTableToXLSX, generateExportFilename } from '../../utils/export.js';
import {
  substitutionPageState,
  getLoadedData,
  getSelectedDate
} from './state.js';

export async function exportSubstitutionData(context, format, dateRange = 'daily') {
  const data = getLoadedData();
  if (!data) {
    throw new Error('ไม่มีข้อมูลสำหรับ Export');
  }

  try {
    let exportData = [];

    if (dateRange === 'daily') {
      const date = getSelectedDate();
      const dateSubstitutions = (data.substitutions || []).filter(
        (substitution) => substitution.absent_date === date
      );

      exportData = dateSubstitutions.map((substitution) => {
        const teacher = (data.teachers || []).find(
          (t) => t.id === substitution.absent_teacher_id
        );
        return {
          วันที่: substitution.absent_date,
          'ครูที่ขาด': teacher?.name || '',
          เหตุผล: substitution.reason || '',
          สถานะ: substitution.status || '',
          ผู้บันทึก: substitution.created_by || ''
        };
      });
    } else if (dateRange === 'monthly') {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const monthlySubstitutions = (data.substitutions || []).filter((substitution) => {
        const subDate = new Date(substitution.absent_date);
        return subDate.getMonth() + 1 === currentMonth && subDate.getFullYear() === currentYear;
      });

      exportData = monthlySubstitutions.map((substitution) => {
        const teacher = (data.teachers || []).find(
          (t) => t.id === substitution.absent_teacher_id
        );
        return {
          วันที่: substitution.absent_date,
          'ครูที่ขาด': teacher?.name || '',
          เหตุผล: substitution.reason || '',
          สถานะ: substitution.status || ''
        };
      });
    }

    const dateLabel =
      dateRange === 'monthly' ? 'รายเดือน' : getSelectedDate() || 'รายวัน';

    const filename = generateExportFilename(
      `สอนแทน-${dateLabel}`,
      context
    );

    switch (format) {
      case 'csv':
        return await exportTableToCSV(exportData, filename);
      case 'xlsx':
        return await exportTableToXLSX(exportData, filename);
      case 'monthly':
        return await exportTableToXLSX(exportData, filename);
      default:
        throw new Error('ไม่รองรับรูปแบบนี้');
    }
  } catch (error) {
    throw new Error(`Export ล้มเหลว: ${error.message}`);
  }
}

export async function exportMonthlySubstitutionReport(context) {
  return exportSubstitutionData(context, 'xlsx', 'monthly');
}
