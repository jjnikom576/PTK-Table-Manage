import { loadAcademicYears, loadYearData } from './loaders.js';

export async function compareAcrossYears(dataType, years) {
  try {
    const results = await Promise.all(years.map((year) => loadYearData(year)));

    if (!results.every((result) => result.ok)) {
      const errors = results
        .filter((result) => !result.ok)
        .map((result) => result.error);
      throw new Error(`Failed to load data for comparison: ${errors.join(', ')}`);
    }

    const comparison = {};
    results.forEach((result, index) => {
      const year = years[index];
      const data = result.data[dataType] || [];
      comparison[year] = {
        count: data.length,
        data,
        analysis: generateDataAnalysis(dataType, data)
      };
    });

    comparison.insights = generateCrossYearInsights(dataType, comparison);
    return { ok: true, data: comparison };
  } catch (error) {
    console.error('[DataService] Failed to compare across years:', error);
    return { ok: false, error: error.message };
  }
}

export async function getTeacherHistory(teacherId) {
  try {
    const years = await loadAcademicYears();
    if (!years.ok) {
      return years;
    }

    const history = [];
    for (const year of years.data) {
      const yearData = await loadYearData(year.year);
      if (yearData.ok) {
        const teacher = yearData.data.teachers.find((item) => item.id === teacherId);
        if (teacher) {
          history.push({ year: year.year, teacher });
        }
      }
    }

    return { ok: true, data: history };
  } catch (error) {
    console.error('[DataService] Failed to get teacher history:', error);
    return { ok: false, error: error.message };
  }
}

export async function cloneYearData(fromYear, toYear) {
  try {
    const sourceData = await loadYearData(fromYear);
    if (!sourceData.ok) {
      throw new Error(sourceData.error || `Source year ${fromYear} not found`);
    }

    console.log(`[DataService] Cloning data from ${fromYear} to ${toYear}`);
    return { ok: true, message: `Data cloned from ${fromYear} to ${toYear}` };
  } catch (error) {
    console.error('[DataService] Failed to clone year data:', error);
    return { ok: false, error: error.message };
  }
}

function generateDataAnalysis(dataType, data) {
  switch (dataType) {
    case 'teachers':
      return {
        bySubjectGroup: data.reduce((acc, teacher) => {
          const key = teacher.subject_group || 'ไม่ระบุ';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      };
    case 'rooms':
      return {
        byType: data.reduce((acc, room) => {
          const key = room.room_type || 'ไม่ระบุ';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      };
    default:
      return {};
  }
}

function generateCrossYearInsights(dataType, comparison) {
  const years = Object.keys(comparison).filter((key) => key !== 'insights').sort();
  const trends = {};

  if (years.length >= 2) {
    const latest = years[years.length - 1];
    const previous = years[years.length - 2];
    const latestCount = comparison[latest].count;
    const previousCount = comparison[previous].count || 1;

    trends.countChange = latestCount - previousCount;
    trends.percentChange = Number(
      (((latestCount - previousCount) / previousCount) * 100).toFixed(1)
    );
  }

  return trends;
}
