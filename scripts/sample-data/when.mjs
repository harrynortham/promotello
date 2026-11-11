// The days a sample offer runs, written the way the picker holds them:
// 0 is Sunday, 6 is Saturday.
//
// The sample offers used to carry an availability string each ("Weekdays
// before 10am"), which is exactly what the form stopped asking for.
// They now carry days, times and who it is for, and the line on the card
// is built from those by availabilityLine().
export const on = {
    weekdays: [1, 2, 3, 4, 5],
    weekends: [6, 0],
    monThu: [1, 2, 3, 4],
    tueThu: [2, 3, 4],
    tueFri: [2, 3, 4, 5],
    thuSat: [4, 5, 6],
    sunThu: [0, 1, 2, 3, 4],
    mon: [1],
    tue: [2],
    wed: [3],
    thu: [4],
    fri: [5],
    sat: [6],
    sun: [0],
};
