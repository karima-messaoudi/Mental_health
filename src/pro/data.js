const nodes = [
  { id: "Tech Sector" },
  { id: "Non-Tech Sector" },
  { id: "Large Company" },
  { id: "Small / Medium Company" },

  { id: "High Workload" },
  { id: "Poor Work-Life Balance" },
  { id: "Job Insecurity" },
  { id: "Lack of Managerial Support" },

  { id: "Fear of Career Impact" },
  { id: "Difficulty Talking to Manager" },
  { id: "Social Isolation" },
  { id: "Seeks Support" },

  { id: "Low Burnout Risk" },
  { id: "Moderate Burnout Risk" },
  { id: "High Burnout Risk" },

  { id: "Healthy & Engaged" },
  { id: "Reduced Productivity" },
  { id: "Absenteeism" },
  { id: "Turnover Risk" }
];

const links = [
  { source: "Tech Sector", target: "High Workload", value: 90 },
  { source: "Tech Sector", target: "Poor Work-Life Balance", value: 60 },

  { source: "Non-Tech Sector", target: "Lack of Managerial Support", value: 70 },
  { source: "Non-Tech Sector", target: "Job Insecurity", value: 40 },

  { source: "Large Company", target: "Poor Work-Life Balance", value: 50 },
  { source: "Small / Medium Company", target: "Job Insecurity", value: 60 },

  { source: "High Workload", target: "Fear of Career Impact", value: 45 },
  { source: "High Workload", target: "Seeks Support", value: 20 },
  { source: "High Workload", target: "Social Isolation", value: 25 },


  { source: "Poor Work-Life Balance", target: "Social Isolation", value: 45 },
  { source: "Poor Work-Life Balance", target: "Seeks Support", value: 35 },

  { source: "Lack of Managerial Support", target: "Difficulty Talking to Manager", value: 45 },
  { source: "Lack of Managerial Support", target: "Social Isolation", value: 25 },


  { source: "Job Insecurity", target: "Fear of Career Impact", value: 70 },

  { source: "Fear of Career Impact", target: "High Burnout Risk", value: 85 },
  { source: "Fear of Career Impact", target: "Moderate Burnout Risk", value: 30 },

  { source: "Social Isolation", target: "Moderate Burnout Risk", value: 60 },
  { source: "Social Isolation", target: "High Burnout Risk", value: 35 },

  { source: "Seeks Support", target: "Low Burnout Risk", value: 55 },

  { source: "Difficulty Talking to Manager", target: "Moderate Burnout Risk", value: 30 },
  { source: "Difficulty Talking to Manager", target: "High Burnout Risk", value: 15 },


  { source: "Low Burnout Risk", target: "Healthy & Engaged", value: 55 },

  { source: "Moderate Burnout Risk", target: "Reduced Productivity", value: 55 },
  { source: "Moderate Burnout Risk", target: "Absenteeism", value: 30 },

  { source: "High Burnout Risk", target: "Absenteeism", value: 45 },
  { source: "High Burnout Risk", target: "Turnover Risk", value: 60 }
];
