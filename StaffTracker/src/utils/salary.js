import dayjs from 'dayjs';

export const calculateSalary = (staff, attendanceRecords, advanceRecords, year, month) => {
  const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
  const present  = attendanceRecords.filter(r => r.status === 'P').length;
  const leave    = attendanceRecords.filter(r => r.status === 'L').length;
  const absent   = attendanceRecords.filter(r => r.status === 'A').length;
  const unmarked = daysInMonth - present - leave - absent;
  
  let grossSalary;
  let paidDays;
  
  if (staff.salary_type === 'daily') {
    paidDays = present;
    grossSalary = parseFloat((present * staff.salary).toFixed(2));
  } else {
    paidDays = present + leave;
    grossSalary = parseFloat(((staff.salary / daysInMonth) * paidDays).toFixed(2));
  }
  
  const totalAdvances = advanceRecords.reduce((sum, a) => sum + a.amount, 0);
  const netPayable    = parseFloat((grossSalary - totalAdvances).toFixed(2));

  return { daysInMonth, present, leave, absent, unmarked, paidDays, grossSalary, totalAdvances, netPayable };
};

// export const calculateSalary = (monthlySalary, presentDays, totalWorkDays) => {
//   const dailyRate = monthlySalary / totalWorkDays;
//   return Math.round(dailyRate * presentDays * 100) / 100;
// };

// export const calculateDeductions = (absentDays, dailyRate) => {
//   return Math.round(absentDays * dailyRate * 100) / 100;
// };

// export const getTotalWorkDays = (year, month) => {
//   const daysInMonth = new Date(year, month, 0).getDate();
//   let workDays = 0;
  
//   for (let day = 1; day <= daysInMonth; day++) {
//     const date = new Date(year, month - 1, day);
//     const dayOfWeek = date.getDay();
//     if (dayOfWeek !== 0) {
//       workDays++;
//     }
//   }
  
//   return workDays;
// };