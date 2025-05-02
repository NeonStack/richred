<script>
  import { Chart, registerables } from "chart.js";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import * as ExcelJS from "exceljs";

  Chart.register(...registerables);
  export let data;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(value);
  };

  const formatPercent = (value) => `${Number(value).toFixed(1)}%`;

  // Updated metrics without emojis
  const metrics = [
    {
      title: "Total Students",
      value: data.basicStats.totalStudents,
      color: "from-blue-500 to-blue-600",
      description: "Total number of students registered in the system",
      type: "students",
    },
    {
      title: "Total Orders",
      value: data.basicStats.totalOrders,
      color: "from-primary to-primary-dark",
      description: "Total number of uniform orders placed",
      type: "orders",
    },
    {
      title: "Completion Rate",
      value: formatPercent(data.basicStats.completionRate),
      color: "from-green-500 to-green-600",
      description: "Percentage of completed orders out of total orders",
      type: "completion",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(data.basicStats.totalRevenue),
      color: "from-purple-500 to-purple-600",
      description: "Total revenue from all paid orders",
      type: "revenue",
    },
  ];

  const timeMetrics = [
    {
      title: "Overdue Orders",
      value: data.timeBasedMetrics.overdueOrders,
      color: "from-red-500 to-red-600",
      description: "Orders past their due date and not completed",
      type: "overdue",
    },
    {
      title: "Due Within 7 Days",
      value: data.timeBasedMetrics.upcomingDue,
      color: "from-yellow-500 to-yellow-600",
      description: "Orders due from today to next 7 days (inclusive)",
      type: "upcoming",
    },
    {
      title: "Avg Completion",
      value: `${data.timeBasedMetrics.averageCompletionTime} days`,
      color: "from-blue-500 to-blue-600",
      description: "Average time to complete an order",
      type: "completion_time",
    },
    {
      title: "Rush Orders",
      value: data.timeBasedMetrics.rushOrders,
      color: "from-orange-500 to-orange-600",
      description: "Orders with 3 or fewer days between order and due date",
      type: "rush",
    },
  ];

  // Improved common chart options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, padding: 15, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 }, color: "#6b7280" },
      },
      y: {
        grid: { color: "#e5e7eb" },
        ticks: { font: { size: 12 }, color: "#6b7280" },
        beginAtZero: true,
      },
    },
  };

  let selectedTimeFrame = "day";
  let selectedRevenueType = "order"; // Add this new state
  const timeFrames = ["day", "week", "month", "year"];

  // Add chart instance variables
  let revenueChart;
  let averageOrderValueChart;
  let orderStatusChart;
  let courseEnrollmentChart;
  let genderChart;
  let busyDaysChart;
  let employeePerformanceChart;
  let quarterlyRevenueChart;
  let paymentStatusChart;
  let completionPerformanceChart;

  // Add corresponding element references
  let revenueChartEl;
  let averageOrderValueChartEl;
  let orderStatusChartEl;
  let courseEnrollmentChartEl;
  let genderChartEl;
  let busyDaysChartEl;
  let employeePerformanceChartEl;
  let quarterlyRevenueChartEl;
  let paymentStatusChartEl;
  let completionPerformanceChartEl;

  // Define consistent color palettes - fix case sensitivity issues
  const colorPalettes = {
    primary: "#B73233",
    secondary: "#E85D2F",
    // Gender colors - make case insensitive
    gender: {
      female: "#FF6B81", // Pink for female
      male: "#3B82F6",   // Blue for male
      Female: "#FF6B81", // Duplicated with correct casing
      Male: "#3B82F6"    // Duplicated with correct casing
    },
    // Status colors - more distinct and meaningful
    status: {
      completed: "#10B981",
      "in progress": "#3B82F6",
      pending: "#F59E0B",
      cancelled: "#EF4444"
    },
    // Payment status colors - include all possible variations
    payment: {
      "fully paid": "#10B981",
      "partially paid": "#F59E0B",
      "not paid": "#EF4444",
      partial: "#F59E0B",
      fullyPaid: "#10B981",
      notPaid: "#EF4444"
    },
    // Delivery performance colors
    delivery: {
      "On Time": "#10B981",
      "on time": "#10B981",
      Late: "#EF4444",
      late: "#EF4444"
    },
    // Color scales for bar charts
    barColors: ["#B73233", "#E85D2F", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"],
    // Color scale for pie/donut charts
    pieColors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"],
    // For reports/categorical data
    categorical: ["#4F46E5", "#7C3AED", "#C026D3", "#DB2777", "#E11D48", "#EA580C", "#D97706", "#65A30D", "#059669", "#0891B2", "#0284C7", "#2563EB"]
  };

  // Chart options - separate by chart type for better customization
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, padding: 15, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 }, color: "#6b7280" },
      },
      y: {
        grid: { color: "#e5e7eb" },
        ticks: { font: { size: 12 }, color: "#6b7280" },
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 3,
        hoverRadius: 5
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Usually not needed for simple bar charts
      },
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 }, color: "#6b7280" },
      },
      y: {
        grid: { color: "#e5e7eb" },
        ticks: { font: { size: 12 }, color: "#6b7280" },
        beginAtZero: true,
      },
    },
  };

  const doughnutPieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { 
          usePointStyle: true, 
          padding: 15, 
          font: { size: 12 },
          generateLabels: function(chart) {
            // Get the default legend items
            const original = Chart.overrides.pie.plugins.legend.labels.generateLabels(chart);
            
            // Calculate the total
            const total = chart.data.datasets[0].data.reduce((sum, value) => sum + value, 0);
            
            // Add percentages to each label
            original.forEach((item, i) => {
              const value = chart.data.datasets[0].data[i];
              const percentage = ((value / total) * 100).toFixed(1);
              item.text = `${chart.data.labels[i]}: ${percentage}%`;
            });
            
            return original;
          }
        },
      },
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#fff",
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
            const value = context.parsed;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${percentage}% (${value})`;
          }
        }
      },
    },
    cutout: "60%", // For doughnut charts
    borderWidth: 1,
    borderColor: "#fff",
  };

  // Function to initialize revenue chart
  function initRevenueChart() {
    if (revenueChart) revenueChart.destroy();
    if (!revenueChartEl) return;

    const timeData = data.financialMetrics.revenueOverTime[selectedTimeFrame];
    let labels = Object.keys(timeData);

    // Special sorting for months
    if (selectedTimeFrame === "month") {
      const monthOrder = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      labels = labels.sort(
        (a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b)
      );
    } else {
      labels = labels.sort();
    }

    const datasets = [
      {
        label: `Revenue by ${selectedRevenueType === "order" ? "Order Date" : "Payment Date"}`,
        data: labels.map((key) => {
          const orderAmount = timeData[key];
          if (selectedRevenueType === "payment") {
            // Use payment_date for revenue when payment type is selected
            return orderAmount.paymentRevenue || 0;
          }
          return orderAmount.orderRevenue || 0;
        }),
        borderColor: colorPalettes.primary,
        backgroundColor: `${colorPalettes.primary}20`, // 20 is hex for 12% opacity
        fill: true,
        tension: 0.4,
        pointBackgroundColor: colorPalettes.primary,
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: colorPalettes.primary,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ];

    revenueChart = new Chart(revenueChartEl, {
      type: "line",
      data: { labels, datasets },
      options: {
        ...lineChartOptions,
        scales: {
          ...lineChartOptions.scales,
          y: {
            ...lineChartOptions.scales.y,
            ticks: { callback: (value) => formatCurrency(value) },
          },
        },
      },
    });
  }

  // Function to initialize average order value chart
  function initAverageOrderValueChart() {
    if (averageOrderValueChart) averageOrderValueChart.destroy();
    if (!averageOrderValueChartEl) return;

    const labels = Object.keys(
      data.additionalMetrics.averageOrderValueOverTime[selectedTimeFrame]
    );

    const values = labels.map((key) => {
      const item =
        data.additionalMetrics.averageOrderValueOverTime[selectedTimeFrame][
          key
        ];
      return item.count > 0 ? (item.total / item.count).toFixed(2) : 0;
    });

    averageOrderValueChart = new Chart(averageOrderValueChartEl, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `Average Order Value (${selectedTimeFrame})`,
            data: values,
            borderColor: colorPalettes.secondary,
            backgroundColor: `${colorPalettes.secondary}20`,
            fill: true,
            tension: 0.4,
            spanGaps: true, // This ensures continuous line even with missing data
            pointBackgroundColor: colorPalettes.secondary,
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: colorPalettes.secondary,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        ...lineChartOptions,
        scales: {
          ...lineChartOptions.scales,
          y: {
            ...lineChartOptions.scales.y,
            ticks: { callback: (value) => formatCurrency(value) },
          },
        },
      },
    });
  }

  // Initialize order status chart - improved with case-insensitive matching
  function initOrderStatusChart() {
    if (orderStatusChart) orderStatusChart.destroy();
    if (!orderStatusChartEl) return;

    const labels = Object.keys(data.orderMetrics.byStatus);
    const values = Object.values(data.orderMetrics.byStatus);
    
    // Match colors to status with better fallbacks
    const backgroundColors = labels.map(status => {
      const statusKey = status.toLowerCase();
      return colorPalettes.status[status] || colorPalettes.status[statusKey] ||
        (statusKey === 'completed' ? "#10B981" : 
         statusKey.includes('progress') ? "#3B82F6" :
         statusKey === 'pending' ? "#F59E0B" : "#777777");
    });

    orderStatusChart = new Chart(orderStatusChartEl, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: backgroundColors,
            borderWidth: 1,
            borderColor: "#fff",
          },
        ],
      },
      options: doughnutPieOptions,
    });
  }

  // Initialize course enrollment chart
  function initCourseEnrollmentChart() {
    if (courseEnrollmentChart) courseEnrollmentChart.destroy();
    if (!courseEnrollmentChartEl) return;

    const courseData = data.studentAnalytics.courseEnrollment;
    
    // Sort courses by enrollment count (descending)
    const sortedCourses = Object.entries(courseData)
      .sort((a, b) => b[1] - a[1]);
    
    const labels = sortedCourses.map(item => item[0]);
    const values = sortedCourses.map(item => item[1]);
    
    // Create gradient colors for courses
    const colors = colorPalettes.barColors;
    const gradientColors = labels.map((_, index) => colors[index % colors.length]);

    courseEnrollmentChart = new Chart(courseEnrollmentChartEl, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Students Enrolled",
            data: values,
            backgroundColor: gradientColors,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
            borderRadius: 4,
          },
        ],
      },
      options: {
        ...barChartOptions,
        indexAxis: 'y', // Horizontal bar chart
        plugins: {
          ...barChartOptions.plugins,
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: { display: true, color: "#e5e7eb" },
            ticks: { font: { size: 12 }, color: "#6b7280" },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 12 }, color: "#6b7280" },
          },
        },
      },
    });
  }

  // Initialize gender distribution chart - improved with case-insensitive matching
  function initGenderChart() {
    if (genderChart) genderChart.destroy();
    if (!genderChartEl) return;

    const genderData = data.studentAnalytics.genderDistribution;
    const labels = Object.keys(genderData);
    const values = Object.values(genderData);
    
    // Get appropriate colors for each gender with better fallback
    const backgroundColors = labels.map(gender => {
      // Try to match with case-insensitive lookup
      const genderKey = gender.toLowerCase();
      return colorPalettes.gender[genderKey] || colorPalettes.gender[gender] || 
        (genderKey === "female" ? "#FF6B81" : "#3B82F6");
    });

    genderChart = new Chart(genderChartEl, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: backgroundColors,
            borderWidth: 1,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        ...doughnutPieOptions,
        plugins: {
          ...doughnutPieOptions.plugins,
          // Add percentages directly in the chart for better readability
          datalabels: {
            formatter: (value, ctx) => {
              const total = ctx.dataset.data.reduce((sum, val) => sum + val, 0);
              const percentage = ((value / total) * 100).toFixed(0) + '%';
              return percentage;
            },
            color: '#fff',
            font: {
              weight: 'bold',
              size: 12
            }
          }
        }
      },
    });
  }

  // Initialize busy days chart
  function initBusyDaysChart() {
    if (busyDaysChart) busyDaysChart.destroy();
    if (!busyDaysChartEl) return;

    // Define order of days
    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    // Get days sorted in proper order
    const busyDaysData = data.timeBasedMetrics.busyDays;
    const sortedDays = Object.keys(busyDaysData)
      .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    const values = sortedDays.map(day => busyDaysData[day]);
    
    busyDaysChart = new Chart(busyDaysChartEl, {
      type: "bar",
      data: {
        labels: sortedDays,
        datasets: [
          {
            label: "Orders",
            data: values,
            backgroundColor: values.map((value, index) => {
              // Use color intensity based on order count
              const normalizedValue = Math.min(value / Math.max(...values), 1);
              const opacity = 0.4 + (normalizedValue * 0.6);
              return `${colorPalettes.secondary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
            }),
            borderWidth: 0,
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        ...barChartOptions,
        plugins: {
          ...barChartOptions.plugins,
          tooltip: {
            ...barChartOptions.plugins.tooltip,
            callbacks: {
              label: (context) => `Orders: ${context.parsed.y}`,
            }
          }
        }
      },
    });
  }

  // Initialize employee performance chart
  function initEmployeePerformanceChart() {
    if (employeePerformanceChart) employeePerformanceChart.destroy();
    if (!employeePerformanceChartEl) return;

    const employeeData = data.performanceMetrics.employeeStats;
    
    // Sort employees by completed orders (descending)
    const sortedEmployees = Object.entries(employeeData)
      .sort((a, b) => b[1].completed - a[1].completed);
    
    const labels = sortedEmployees.map(item => item[0]);
    const completedValues = sortedEmployees.map(item => item[1].completed);
    
    employeePerformanceChart = new Chart(employeePerformanceChartEl, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Completed Orders",
            data: completedValues,
            backgroundColor: colorPalettes.status.completed,
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          }
        ],
      },
      options: {
        ...barChartOptions,
        indexAxis: 'y', // Horizontal bar chart for better readability
        scales: {
          x: {
            grid: { display: true, color: "#e5e7eb" },
            ticks: { font: { size: 12 }, color: "#6b7280" },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 12 }, color: "#6b7280" },
          },
        },
      },
    });
  }

  // Initialize quarterly revenue chart with proper quarter ordering
  function initQuarterlyRevenueChart() {
    if (quarterlyRevenueChart) quarterlyRevenueChart.destroy();
    if (!quarterlyRevenueChartEl) return;

    const quarterlyData = data.financialMetrics.revenueByQuarter;
    
    // Ensure quarters are in correct order: Q1, Q2, Q3, Q4
    const orderedQuarters = ['Q1', 'Q2', 'Q3', 'Q4'].filter(q => quarterlyData[q] !== undefined);
    const values = orderedQuarters.map(quarter => quarterlyData[quarter]);
    
    quarterlyRevenueChart = new Chart(quarterlyRevenueChartEl, {
      type: "bar",
      data: {
        labels: orderedQuarters,
        datasets: [
          {
            label: "Revenue",
            data: values,
            backgroundColor: values.map((_, index) => {
              // Create gradient effect
              const baseColor = colorPalettes.primary;
              const opacity = 0.7 + (index * 0.1);
              return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
            }),
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        ...barChartOptions,
        scales: {
          ...barChartOptions.scales,
          y: {
            ...barChartOptions.scales.y,
            ticks: { callback: (value) => formatCurrency(value) },
          },
        },
        plugins: {
          ...barChartOptions.plugins,
          tooltip: {
            ...barChartOptions.plugins.tooltip,
            callbacks: {
              label: (context) => `Revenue: ${formatCurrency(context.parsed.y)}`,
            }
          }
        }
      },
    });
  }

  // Initialize payment status chart - improved with case-insensitive matching
  function initPaymentStatusChart() {
    if (paymentStatusChart) paymentStatusChart.destroy();
    if (!paymentStatusChartEl) return;

    const paymentData = data.financialMetrics.paymentStats;
    const labels = Object.keys(paymentData);
    const values = Object.values(paymentData);
    
    // Fix default colors mapping for payment status
    const defaultColors = {
      "fully paid": "#10B981",
      partial: "#F59E0B", 
      "not paid": "#EF4444",
      "fullyPaid": "#10B981", 
      "partiallyPaid": "#F59E0B", 
      "notPaid": "#EF4444"
    };
    
    // Match colors to payment status with better fallbacks
    const backgroundColors = labels.map(status => {
      const statusKey = status.toLowerCase();
      return colorPalettes.payment[status] || colorPalettes.payment[statusKey] || 
        defaultColors[status] || defaultColors[statusKey] || 
        (statusKey.includes("paid") && statusKey.includes("not") ? "#EF4444" : 
         statusKey.includes("partial") ? "#F59E0B" : "#10B981");
    });

    paymentStatusChart = new Chart(paymentStatusChartEl, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: backgroundColors,
            borderWidth: 1,
            borderColor: "#fff",
          },
        ],
      },
      options: doughnutPieOptions,
    });
  }

  // Initialize completion performance chart - improved with case-insensitive matching
  function initCompletionPerformanceChart() {
    if (completionPerformanceChart) completionPerformanceChart.destroy();
    if (!completionPerformanceChartEl) return;

    const performanceData = data.timeBasedMetrics.deliveryPerformance;
    
    completionPerformanceChart = new Chart(completionPerformanceChartEl, {
      type: "doughnut",
      data: {
        labels: ["On Time", "Late"],
        datasets: [
          {
            data: [performanceData.onTime, performanceData.late],
            backgroundColor: [
              "#10B981",  // Always green for on-time
              "#EF4444"   // Always red for late
            ],
            borderWidth: 1,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        ...doughnutPieOptions,
        plugins: {
          ...doughnutPieOptions.plugins
        }
      },
    });
  }

  // Update charts function
  function updateCharts() {
    initRevenueChart();
    initAverageOrderValueChart();
    initOrderStatusChart();
    initCourseEnrollmentChart();
    initGenderChart();
    initBusyDaysChart();
    initEmployeePerformanceChart();
    initQuarterlyRevenueChart();
    initPaymentStatusChart();
    initCompletionPerformanceChart();
  }

  onMount(async () => {
    updateCharts();
  });

  onDestroy(() => {
    // Cleanup charts
    if (revenueChart) revenueChart.destroy();
    if (averageOrderValueChart) averageOrderValueChart.destroy();
    if (orderStatusChart) orderStatusChart.destroy();
    if (courseEnrollmentChart) courseEnrollmentChart.destroy();
    if (genderChart) genderChart.destroy();
    if (busyDaysChart) busyDaysChart.destroy();
    if (employeePerformanceChart) employeePerformanceChart.destroy();
    if (quarterlyRevenueChart) quarterlyRevenueChart.destroy();
    if (paymentStatusChart) paymentStatusChart.destroy();
    if (completionPerformanceChart) completionPerformanceChart.destroy();
  });

  $: if (selectedTimeFrame || selectedRevenueType) {
    updateCharts(); // Update charts when time frame changes
  }

  // State for modals
  let activeModal = null;
  let modalData = null;

  // Function to handle card clicks
  async function handleCardClick(metric) {
    try {
      let details;
      switch (metric) {
        case "students":
          details = {
            title: "Student List",
            data: data.studentAnalytics.studentList,
            columns: ["Name", "Course", "Gender"],
          };
          break;
        case "orders":
          details = {
            title: "Order List",
            data: data.orderMetrics.allOrders,
            columns: ["Student", "Type", "Status", "Amount"],
          };
          break;
        case "completion":
          details = {
            title: "Completion Statistics",
            data: data.orderMetrics.completionDetails,
            columns: ["Status", "Count", "Percentage"],
          };
          break;
        case "revenue":
          details = {
            title: "Revenue Details",
            data: data.financialMetrics.revenueDetails,
            columns: ["Category", "Amount", "Percentage"],
          };
          break;
        case "overdue":
          details = {
            title: "Overdue Orders",
            data: data.timeBasedMetrics.additionalMetrics.overdueDetails,
            columns: ["Student", "Due Date", "Days Overdue"],
          };
          break;
        case "upcoming":
          details = {
            title: "Upcoming Due Orders",
            data: data.timeBasedMetrics.additionalMetrics.upcomingDueDetails,
            columns: ["Student", "Due Date", "Status"],
          };
          break;
        case "completion_time":
          details = {
            title: "Completion Time Details",
            data: data.timeBasedMetrics.additionalMetrics.avgCompletionDetails
              .breakdown,
            columns: ["Student", "Days to Complete", "Completed At"],
          };
          break;
        case "rush":
          details = {
            title: "Rush Orders",
            data: data.timeBasedMetrics.additionalMetrics.rushOrderDetails,
            columns: ["Student", "Order Date", "Due Date", "Days to Complete"],
          };
          break;
      }
      modalData = details;
      activeModal = metric;
    } catch (error) {
      console.error("Error loading details:", error);
    }
  }

  function closeModal() {
    activeModal = null;
    modalData = null;
  }

  async function generateExcelReport() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RichRed Admin Dashboard";
    workbook.lastModifiedBy = "System";
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Define consistent styles
    const styles = {
      header: {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB73233' } },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'left', vertical: 'middle' }
      },
      sectionHeader: {
        font: { bold: true, size: 12 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } },
        alignment: { horizontal: 'left', vertical: 'middle' }
      },
      total: {
        font: { bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'left' }
      },
      cell: {
        alignment: { horizontal: 'left' }
      },
      currency: {
        numFmt: '#,##0.00',  // Removed peso symbol
        alignment: { horizontal: 'left' }
      },
      percentage: {
        numFmt: '0.00"%"',
        alignment: { horizontal: 'left' }
      },
      date: {
        numFmt: 'yyyy-mm-dd',
        alignment: { horizontal: 'left' }
      },
      greenHighlight: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } } },
      redHighlight: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } } },
      yellowHighlight: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9E6' } } },
      alternateRow: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } } }
    };
    
    // Helper functions for consistent sheet creation
    const helpers = {
      // Apply header styles to the first row of a sheet
      applyHeaderRow: (sheet, rowIndex = 1) => {
        const headerRow = sheet.getRow(rowIndex);
        headerRow.height = 22;
        headerRow.eachCell((cell) => {
          cell.style = styles.header;
        });
        return rowIndex;
      },
      
      // Create a section header that spans all columns
      addSectionHeader: (sheet, text, columnCount) => {
        const rowIndex = sheet.rowCount + 1;
        sheet.addRow([text]);
        if (columnCount > 1) {
          sheet.mergeCells(`A${rowIndex}:${String.fromCharCode(64 + columnCount)}${rowIndex}`);
        }
        const headerCell = sheet.getCell(`A${rowIndex}`);
        headerCell.style = styles.sectionHeader;
        return rowIndex;
      },
      
      // Add total row with consistent formatting - fixed to avoid currency on non-monetary columns
      addTotalRow: (sheet, columnCount, calculateColumns = [], startRow = 2, endRow = null) => {
        // If endRow not specified, use the row before current last row
        if (endRow === null) endRow = sheet.rowCount;
        
        const totalRow = sheet.addRow(["TOTAL"]);
        
        // Apply formulas to calculate columns - only for the specific section
        calculateColumns.forEach(col => {
          if (col > 1) { // Skip first column which is the "TOTAL" label
            const colLetter = String.fromCharCode(64 + col);
            
            // Store the formula result with explicit numeric type to prevent Excel from formatting as date
            totalRow.getCell(col).value = {
              formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})`,
              date1904: false
            };
            
            // Enforce number type for count columns to prevent date formatting
            if (sheet.getColumn(col).values && sheet.getColumn(col).values.some(v => typeof v === 'number')) {
              totalRow.getCell(col).numFmt = '0'; // Simple number format for counts
            }
          }
        });
        
        // Apply total style to all cells in the row but without currency format on non-monetary columns
        totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber <= columnCount) {
            cell.style = styles.total;
            
            // Check if the column contains monetary values (look for currency formatting in the column's cells)
            const column = sheet.getColumn(colNumber);
            const isMonetary = column.values && column.values.some(v => {
              const cellInCol = typeof v === 'object' && v !== null;
              return cellInCol && v.numFmt && v.numFmt.includes('#,##0.00');
            });
            
            if (isMonetary && calculateColumns.includes(colNumber)) {
              cell.numFmt = styles.currency.numFmt;
            }
          }
        });
        
        return totalRow.number; // Return the row number
      },
      
      // Auto size columns based on content
      autoSizeColumns: (sheet) => {
        sheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = Math.min(maxLength + 4, 50);
        });
      },
      
      // Apply alternating row colors
      applyAlternatingRows: (sheet, startRow = 2) => {
        for (let i = startRow; i <= sheet.rowCount; i++) {
          if (i % 2 === 0) {
            sheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
              // Only apply if not already styled
              if (!cell.style.fill || !cell.style.fill.fgColor) {
                cell.style = Object.assign({}, cell.style, styles.alternateRow);
              }
            });
          }
        }
      }
    };
    
    // 1. EXECUTIVE SUMMARY SHEET
    const summarySheet = workbook.addWorksheet("Executive Summary");
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 30, style: styles.cell },
      { header: "Value", key: "value", width: 20, style: styles.cell },
      { header: "Description", key: "description", width: 50, style: styles.cell }
    ];
    helpers.applyHeaderRow(summarySheet);
    
    // Add report title
    summarySheet.mergeCells('A1:C1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = "RICHRED CLOTHESHOPPE - EXECUTIVE DASHBOARD";
    titleCell.style = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB73233' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    summarySheet.getRow(1).height = 30;
    
    // Add report generation timestamp
    summarySheet.mergeCells('A2:C2');
    const dateCell = summarySheet.getCell('A2');
    dateCell.value = `Report Generated: ${new Date().toLocaleString()}`;
    dateCell.style = { font: { italic: true }, alignment: { horizontal: 'center' } };
    
    // Add core metrics section
    helpers.addSectionHeader(summarySheet, "CORE BUSINESS METRICS", 3);
    
    // Add basic metrics with proper formatting
    metrics.forEach(metric => {
      const row = summarySheet.addRow([
        metric.title,
        metric.value,
        metric.description
      ]);
      
      // Apply style
      row.getCell(1).style = styles.cell;
      row.getCell(3).style = styles.cell;
      
      // Format value cell based on type
      const valueCell = row.getCell(2);
      valueCell.style = styles.cell;
      
      if (metric.type === 'revenue') {
        valueCell.style = Object.assign({}, styles.cell, styles.currency);
      }
      else if (metric.type === 'completion') {
        valueCell.style = styles.percentage;
      }
    });
    
    // Add time metrics section
    helpers.addSectionHeader(summarySheet, "TIME-BASED METRICS", 3);
    
    timeMetrics.forEach(metric => {
      const row = summarySheet.addRow([
        metric.title, 
        metric.value,
        metric.description
      ]);
      
      // Apply style
      row.eachCell((cell) => {
        cell.style = styles.cell;
      });
    });
    
    // 2. ORDERS ANALYSIS SHEET
    const ordersSheet = workbook.addWorksheet("Orders Analysis");
    ordersSheet.columns = [
      { header: "Student", key: "student", width: 25, style: styles.cell },
      { header: "Order Date", key: "orderDate", width: 15, style: styles.date },
      { header: "Due Date", key: "dueDate", width: 15, style: styles.date },
      { header: "Status", key: "status", width: 15, style: styles.cell },
      { header: "Total Amount", key: "amount", width: 15, style: styles.currency },
      { header: "Amount Paid", key: "amountPaid", width: 15, style: styles.currency },
      { header: "Balance", key: "balance", width: 15, style: styles.currency },
      { header: "Days to Complete", key: "daysToComplete", width: 20, style: styles.cell }
    ];
    helpers.applyHeaderRow(ordersSheet);
    
    // Add order data
    const orderData = data.rawData.detailedOrders.map(order => {
      const orderDate = new Date(order.created_at);
      const dueDate = new Date(order.due_date);
      const completedDate = order.completed_at ? new Date(order.completed_at) : null;
      const daysToComplete = completedDate 
        ? Math.ceil((completedDate - orderDate) / (1000 * 60 * 60 * 24)) 
        : null;
      
      return {
        student: `${order.students?.first_name || ''} ${order.students?.last_name || ''}`,
        orderDate: orderDate,
        dueDate: dueDate,
        status: order.status || '',
        amount: order.total_amount || 0,
        amountPaid: order.amount_paid || 0,
        balance: order.balance || 0,
        daysToComplete: daysToComplete !== null ? daysToComplete : 'N/A'
      };
    });
    
    // Track section boundaries
    const orderDataStartRow = 2;
    
    orderData.forEach(order => {
      ordersSheet.addRow(order);
    });
    
    const orderDataEndRow = ordersSheet.rowCount;
    
    // Add totals row with all relevant columns calculated - using section boundaries
    helpers.addTotalRow(ordersSheet, 8, [5, 6, 7], orderDataStartRow, orderDataEndRow);
    
    // Add order status section - track the section boundaries
    const statusHeaderRow = helpers.addSectionHeader(ordersSheet, "ORDER STATUS BREAKDOWN", 8);
    
    // Add status header row
    const statusTableHeaderRow = statusHeaderRow + 1;
    ordersSheet.addRow(["Status", "Count", "Percentage", "", "", "", "", ""]);
    helpers.applyHeaderRow(ordersSheet, statusTableHeaderRow);
    
    // Status data starts in the next row
    const statusDataStartRow = statusTableHeaderRow + 1;
    
    // Calculate status breakdown
    const statusCounts = {};
    orderData.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = total > 0 ? (count / total * 100) : 0;
      
      // Explicitly create a row with proper numeric types to avoid date formatting
      const row = ordersSheet.addRow([
        status, 
        Number(count),   // Explicitly use Number type for count
        percentage
      ]);
      
      // Apply percentage format to the percentage cell
      row.getCell(3).numFmt = '0.00"%"';
      
      // Ensure count is numeric with whole number format
      row.getCell(2).numFmt = '0';
    });
    
    const statusDataEndRow = ordersSheet.rowCount;
    
    // Add totals for status counts - only for this section
    helpers.addTotalRow(ordersSheet, 3, [2], statusDataStartRow, statusDataEndRow);
    
    // 3. FINANCIAL ANALYSIS SHEET
    const financialSheet = workbook.addWorksheet("Financial Analysis");
    financialSheet.columns = [
      { header: "Month", key: "month", width: 15, style: styles.cell },
      { header: "Orders", key: "orders", width: 10, style: styles.cell },
      { header: "Total Amount", key: "totalAmount", width: 15, style: styles.currency },
      { header: "Amount Paid", key: "amountPaid", width: 15, style: styles.currency },
      { header: "Balance", key: "balance", width: 15, style: styles.currency },
      { header: "Completion Rate", key: "completionRate", width: 15, style: styles.percentage }
    ];
    helpers.applyHeaderRow(financialSheet);
    
    // Group orders by month
    const monthlyData = {};
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    data.rawData.detailedOrders.forEach(order => {
      const date = new Date(order.created_at);
      const monthYear = `${monthOrder[date.getMonth()]} ${date.getFullYear()}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          orders: 0,
          totalAmount: 0,
          amountPaid: 0,
          balance: 0,
          completed: 0,
          totalOrders: 0
        };
      }
      
      monthlyData[monthYear].orders++;
      monthlyData[monthYear].totalAmount += Number(order.total_amount || 0);
      monthlyData[monthYear].amountPaid += Number(order.amount_paid || 0);
      monthlyData[monthYear].balance += Number(order.balance || 0);
      monthlyData[monthYear].totalOrders++;
      
      if (order.status === 'completed') {
        monthlyData[monthYear].completed++;
      }
    });
    
    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
      const [aMonth, aYear] = a.split(' ');
      const [bMonth, bYear] = b.split(' ');
      
      if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
      return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
    });
    
    // Financial data starts in row 2
    const financialDataStartRow = 2;
    
    // Add monthly data rows
    sortedMonths.forEach(month => {
      const data = monthlyData[month];
      const completionRate = data.totalOrders > 0 ? (data.completed / data.totalOrders * 100) : 0;
      
      financialSheet.addRow({
        month,
        orders: data.orders,
        totalAmount: data.totalAmount,
        amountPaid: data.amountPaid,
        balance: data.balance,
        completionRate
      });
    });
    
    const financialDataEndRow = financialSheet.rowCount;
    
    // Add totals with proper formatting for all numeric columns
    helpers.addTotalRow(financialSheet, 6, [2, 3, 4, 5], financialDataStartRow, financialDataEndRow);
    
    // 4. STUDENT DEMOGRAPHICS SHEET
    const studentsSheet = workbook.addWorksheet("Student Demographics");
    studentsSheet.columns = [
      { header: "Course", key: "course", width: 15, style: styles.cell },
      { header: "Male Students", key: "male", width: 15, style: styles.cell },
      { header: "Female Students", key: "female", width: 15, style: styles.cell },
      { header: "Total Students", key: "total", width: 15, style: styles.cell },
      { header: "Orders Placed", key: "orders", width: 15, style: styles.cell },
      { header: "Revenue Generated", key: "revenue", width: 20, style: styles.currency }
    ];
    helpers.applyHeaderRow(studentsSheet);
    
    // Calculate course demographics and orders
    const courseStats = {};
    
    // Count students by course and gender
    data.rawData.detailedStudents.forEach(student => {
      const course = student.courses?.course_code || 'Unknown';
      
      if (!courseStats[course]) {
        courseStats[course] = {
          male: 0,
          female: 0,
          total: 0,
          orders: 0,
          revenue: 0
        };
      }
      
      if (student.gender?.toLowerCase() === 'male') {
        courseStats[course].male++;
      } else if (student.gender?.toLowerCase() === 'female') {
        courseStats[course].female++;
      }
      
      courseStats[course].total++;
    });
    
    // Count orders by course
    data.rawData.detailedOrders.forEach(order => {
      const course = order.students?.courses?.course_code || 'Unknown';
      if (courseStats[course]) {
        courseStats[course].orders++;
        courseStats[course].revenue += Number(order.amount_paid || 0);
      }
    });
    
    // Course data starts at row 2
    const courseDataStartRow = 2;
    
    // Add course data rows
    Object.entries(courseStats).forEach(([course, stats]) => {
      studentsSheet.addRow({
        course,
        male: stats.male,
        female: stats.female,
        total: stats.total,
        orders: stats.orders,
        revenue: stats.revenue
      });
    });
    
    const courseDataEndRow = studentsSheet.rowCount;
    
    // Add totals for all numeric columns
    helpers.addTotalRow(studentsSheet, 6, [2, 3, 4, 5, 6], courseDataStartRow, courseDataEndRow);
    
    // Add gender distribution section
    const genderHeaderRow = helpers.addSectionHeader(studentsSheet, "GENDER DISTRIBUTION", 6);
    
    // Add gender header row
    const genderTableHeaderRow = genderHeaderRow + 1;
    studentsSheet.addRow(["Gender", "Count", "Percentage", "", "", ""]);
    helpers.applyHeaderRow(studentsSheet, genderTableHeaderRow);
    
    // Gender data starts after the header
    const genderDataStartRow = genderTableHeaderRow + 1;
    
    // Calculate gender totals
    const genderData = data.studentAnalytics.genderDistribution;
    const totalStudents = Object.values(genderData).reduce((sum, val) => sum + val, 0);
    
    // Add gender data rows
    Object.entries(genderData).forEach(([gender, count]) => {
      const percentage = totalStudents > 0 ? (count / totalStudents * 100) : 0;
      const row = studentsSheet.addRow([gender, count, percentage]);
      row.getCell(3).numFmt = '0.00"%"';
    });
    
    const genderDataEndRow = studentsSheet.rowCount;
    
    // Add gender totals - only for the gender section
    helpers.addTotalRow(studentsSheet, 3, [2], genderDataStartRow, genderDataEndRow);
    
    // 5. PAYMENT ANALYSIS SHEET
    const paymentSheet = workbook.addWorksheet("Payment Analysis");
    paymentSheet.columns = [
      { header: "Order ID", key: "id", width: 10, style: styles.cell },
      { header: "Student", key: "student", width: 25, style: styles.cell },
      { header: "Total Amount", key: "total", width: 15, style: styles.currency },
      { header: "Amount Paid", key: "paid", width: 15, style: styles.currency },
      { header: "Balance", key: "balance", width: 15, style: styles.currency },
      { header: "Payment Status", key: "status", width: 15, style: styles.cell },
      { header: "Payment Date", key: "date", width: 15, style: styles.date }
    ];
    helpers.applyHeaderRow(paymentSheet);
    
    // Payment data starts at row 2
    const paymentDataStartRow = 2;
    
    // Add payment data
    data.rawData.paymentTracking.forEach(payment => {
      const row = paymentSheet.addRow({
        id: payment.id,
        student: `${payment.students?.first_name || ''} ${payment.students?.last_name || ''}`,
        total: Number(payment.total_amount || 0),
        paid: Number(payment.amount_paid || 0),
        balance: Number(payment.balance || 0),
        status: payment.payment_status || '',
        date: payment.payment_date ? new Date(payment.payment_date) : null
      });
    });
    
    const paymentDataEndRow = paymentSheet.rowCount;
    
    // Add payment totals
    helpers.addTotalRow(paymentSheet, 7, [3, 4, 5], paymentDataStartRow, paymentDataEndRow);
    
    // Add payment status section
    const statusSectionHeaderRow = helpers.addSectionHeader(paymentSheet, "PAYMENT STATUS BREAKDOWN", 7);
    
    // Add payment status header
    const statusSectionTableHeaderRow = statusSectionHeaderRow + 1;
    paymentSheet.addRow(["Status", "Count", "Percentage", "Total Value", "", "", ""]);
    helpers.applyHeaderRow(paymentSheet, statusSectionTableHeaderRow);
    
    // Status section data starts after header
    const paymentStatusDataStartRow = statusSectionTableHeaderRow + 1;
    
    // Calculate payment status stats
    const paymentStatusCounts = {};
    const paymentStatusValues = {};
    
    data.rawData.paymentTracking.forEach(payment => {
      const status = payment.payment_status || 'Unknown';
      paymentStatusCounts[status] = (paymentStatusCounts[status] || 0) + 1;
      paymentStatusValues[status] = (paymentStatusValues[status] || 0) + Number(payment.amount_paid || 0);
    });
    
    const totalPayments = Object.values(paymentStatusCounts).reduce((sum, count) => sum + count, 0);
    
    // Add payment status data
    Object.entries(paymentStatusCounts).forEach(([status, count]) => {
      const percentage = totalPayments > 0 ? (count / totalPayments * 100) : 0;
      const value = paymentStatusValues[status];
      
      const row = paymentSheet.addRow([status, count, percentage, value]);
      row.getCell(3).numFmt = '0.00"%"';
      row.getCell(4).numFmt = '"₱"#,##0.00';
    });
    
    const paymentStatusDataEndRow = paymentSheet.rowCount;
    
    // Add payment status totals - only for this section
    helpers.addTotalRow(paymentSheet, 4, [2, 4], paymentStatusDataStartRow, paymentStatusDataEndRow);
    
    // 6. EMPLOYEE PERFORMANCE SHEET
    const employeesSheet = workbook.addWorksheet("Employee Performance");
    employeesSheet.columns = [
      { header: "Employee", key: "employee", width: 25, style: styles.cell },
      { header: "Role", key: "role", width: 15, style: styles.cell },
      { header: "Orders Assigned", key: "assigned", width: 15, style: styles.cell },
      { header: "Orders Completed", key: "completed", width: 17, style: styles.cell },
      { header: "Completion Rate", key: "completionRate", width: 15, style: styles.percentage },
      { header: "Average Days", key: "avgDays", width: 15, style: styles.cell }
    ];
    helpers.applyHeaderRow(employeesSheet);
    
    // Employee data starts at row 2
    const employeeDataStartRow = 2;
    
    // Calculate employee stats
    const employeeStats = {};
    
    // Initialize with basic employee data
    data.rawData.employees.forEach(employee => {
      const name = `${employee.first_name || ''} ${employee.last_name || ''}`;
      if (!name.trim()) return;
      
      employeeStats[name] = {
        role: employee.role || 'Staff',
        assigned: 0,
        completed: 0,
        totalDays: 0
      };
    });
    
    // Calculate order stats by employee
    data.rawData.detailedOrders.filter(o => o.profiles).forEach(order => {
      if (!order.profiles) return;
      
      const employee = `${order.profiles.first_name || ''} ${order.profiles.last_name || ''}`;
      if (!employee.trim()) return;
      
      if (!employeeStats[employee]) {
        employeeStats[employee] = {
          role: 'Staff',
          assigned: 0,
          completed: 0,
          totalDays: 0
        };
      }
      
      employeeStats[employee].assigned++;
      
      if (order.status === 'completed') {
        employeeStats[employee].completed++;
        
        if (order.created_at && order.completed_at) {
          const createdDate = new Date(order.created_at);
          const completedDate = new Date(order.completed_at);
          const days = Math.max(0, Math.ceil((completedDate - createdDate) / (1000 * 60 * 60 * 24)));
          
          employeeStats[employee].totalDays += days;
        }
      }
    });
    
    // Add employee data rows
    Object.entries(employeeStats)
      .filter(([_, stats]) => stats.assigned > 0)
      .sort((a, b) => b[1].completed - a[1].completed)
      .forEach(([employee, stats]) => {
        const completionRate = stats.assigned > 0 ? (stats.completed / stats.assigned * 100) : 0;
        const avgDays = stats.completed > 0 ? (stats.totalDays / stats.completed) : 0;
        
        employeesSheet.addRow({
          employee,
          role: stats.role,
          assigned: stats.assigned,
          completed: stats.completed,
          completionRate,
          avgDays: avgDays.toFixed(1)
        });
      });
    
    const employeeDataEndRow = employeesSheet.rowCount;
    
    // Add employee totals
    helpers.addTotalRow(employeesSheet, 6, [3, 4], employeeDataStartRow, employeeDataEndRow);
    
    // 7. TIME ANALYTICS SHEET
    const timeSheet = workbook.addWorksheet("Time Analytics");
    timeSheet.columns = [
      { header: "Time Period", key: "period", width: 20, style: styles.cell },
      { header: "Orders", key: "orders", width: 15, style: styles.cell },
      { header: "Completed", key: "completed", width: 15, style: styles.cell },
      { header: "Completion Rate", key: "completionRate", width: 15, style: styles.percentage },
      { header: "Avg Completion Days", key: "avgDays", width: 20, style: styles.cell },
      { header: "Revenue", key: "revenue", width: 15, style: styles.currency }
    ];
    helpers.applyHeaderRow(timeSheet);
    
    // Daily busy data
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayStats = {};
    
    // Initialize days
    dayNames.forEach(day => {
      dayStats[day] = {
        orders: 0,
        completed: 0,
        totalDays: 0,
        revenue: 0
      };
    });
    
    // Calculate stats by day of week
    data.rawData.detailedOrders.forEach(order => {
      if (!order.created_at) return;
      
      const date = new Date(order.created_at);
      const day = dayNames[date.getDay()];
      
      dayStats[day].orders++;
      dayStats[day].revenue += Number(order.amount_paid || 0);
      
      if (order.status === 'completed') {
        dayStats[day].completed++;
        
        if (order.completed_at) {
          const completedDate = new Date(order.completed_at);
          const days = Math.max(0, Math.ceil((completedDate - date) / (1000 * 60 * 60 * 24)));
          dayStats[day].totalDays += days;
        }
      }
    });
    
    // Add day of week header
    const dayHeaderRow = helpers.addSectionHeader(timeSheet, "ORDERS BY DAY OF WEEK", 6);
    
    // Add day header row
    const dayTableHeaderRow = dayHeaderRow + 1;
    timeSheet.addRow(["Day", "Orders", "Completed", "Completion Rate", "Avg Days", "Revenue"]);
    helpers.applyHeaderRow(timeSheet, dayTableHeaderRow);
    
    // Day data starts after header
    const dayDataStartRow = dayTableHeaderRow + 1;
    
    // Add day data rows
    dayNames.forEach(day => {
      const stats = dayStats[day];
      const completionRate = stats.orders > 0 ? (stats.completed / stats.orders * 100) : 0;
      const avgDays = stats.completed > 0 ? (stats.totalDays / stats.completed) : 0;
      
      timeSheet.addRow({
        period: day,
        orders: Number(stats.orders), // Ensure it's a number
        completed: Number(stats.completed), // Ensure it's a number
        completionRate,
        avgDays: avgDays.toFixed(1),
        revenue: stats.revenue
      });
    });
    
    const dayDataEndRow = timeSheet.rowCount;
    
    // Add day totals - only for the day section
    helpers.addTotalRow(timeSheet, 6, [2, 3, 5, 6], dayDataStartRow, dayDataEndRow);
    
    // Add DAILY analysis section
    const dailyHeaderRow = helpers.addSectionHeader(timeSheet, "DAILY TIME PERFORMANCE (LAST 30 DAYS)", 6);
    
    // Add daily header row
    const dailyTableHeaderRow = dailyHeaderRow + 1;
    timeSheet.addRow(["Date", "Orders", "Completed", "Completion Rate", "Avg Days", "Revenue"]);
    helpers.applyHeaderRow(timeSheet, dailyTableHeaderRow);
    
    // Process daily data for the last 30 days
    const now = new Date();
    const dailyStats = {};
    
    // Initialize data for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      dailyStats[dateKey] = {
        orders: 0,
        completed: 0,
        totalDays: 0,
        revenue: 0
      };
    }
    
    // Populate daily stats
    data.rawData.detailedOrders.forEach(order => {
      if (!order.created_at) return;
      
      const orderDate = new Date(order.created_at);
      const dateKey = orderDate.toISOString().split('T')[0];
      
      // Only include if within the last 30 days
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].orders++;
        dailyStats[dateKey].revenue += Number(order.amount_paid || 0);
        
        if (order.status === 'completed' && order.completed_at) {
          dailyStats[dateKey].completed++;
          
          const completedDate = new Date(order.completed_at);
          const days = Math.max(0, Math.ceil((completedDate - orderDate) / (1000 * 60 * 60 * 24)));
          dailyStats[dateKey].totalDays += days;
        }
      }
    });
    
    // Daily data starts after header
    const dailyDataStartRow = dailyTableHeaderRow + 1;
    
    // Add daily data rows - last 30 days
    Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b)) // Sort by date
      .forEach(([date, stats]) => {
        const completionRate = stats.orders > 0 ? (stats.completed / stats.orders * 100) : 0;
        const avgDays = stats.completed > 0 ? (stats.totalDays / stats.completed) : 0;
        
        timeSheet.addRow({
          period: date,
          orders: Number(stats.orders),
          completed: Number(stats.completed),
          completionRate,
          avgDays: avgDays.toFixed(1),
          revenue: stats.revenue
        });
      });
    
    const dailyDataEndRow = timeSheet.rowCount;
    
    // Add daily totals
    helpers.addTotalRow(timeSheet, 6, [2, 3, 5, 6], dailyDataStartRow, dailyDataEndRow);
    
    // Add monthly analysis section
    const monthHeaderRow = helpers.addSectionHeader(timeSheet, "MONTHLY TIME PERFORMANCE", 6);
    
    // Add monthly header row
    const monthTableHeaderRow = monthHeaderRow + 1;
    timeSheet.addRow(["Month", "Orders", "Completed", "Completion Rate", "Avg Days", "Revenue"]);
    helpers.applyHeaderRow(timeSheet, monthTableHeaderRow);
    
    // Month data starts after header
    const monthDataStartRow = monthTableHeaderRow + 1;
    
    // Use the previously calculated monthly data
    sortedMonths.forEach(month => {
      const stats = monthlyData[month];
      const completionRate = stats.totalOrders > 0 ? (stats.completed / stats.totalOrders * 100) : 0;
      
      // Calculate average days for completed orders in this month
      let avgDays = 0;
      let totalDays = 0;
      let totalCompleted = 0;
      
      data.rawData.detailedOrders.forEach(order => {
        if (order.status !== 'completed' || !order.created_at || !order.completed_at) return;
        
        const createdDate = new Date(order.created_at);
        const monthYear = `${monthOrder[createdDate.getMonth()]} ${createdDate.getFullYear()}`;
        
        if (monthYear === month) {
          const completedDate = new Date(order.completed_at);
          const days = Math.max(0, Math.ceil((completedDate - createdDate) / (1000 * 60 * 60 * 24)));
          totalDays += days;
          totalCompleted++;
        }
      });
      
      avgDays = totalCompleted > 0 ? (totalDays / totalCompleted) : 0;
      
      timeSheet.addRow({
        period: month,
        orders: Number(stats.totalOrders),
        completed: Number(stats.completed),
        completionRate,
        avgDays: avgDays.toFixed(1),
        revenue: stats.amountPaid
      });
    });
    
    const monthDataEndRow = timeSheet.rowCount;
    
    // Add monthly totals - only for the month section
    helpers.addTotalRow(timeSheet, 6, [2, 3, 5, 6], monthDataStartRow, monthDataEndRow);
    
    // Add YEARLY analysis section
    const yearlyHeaderRow = helpers.addSectionHeader(timeSheet, "YEARLY TIME PERFORMANCE", 6);
    
    // Add yearly header row
    const yearlyTableHeaderRow = yearlyHeaderRow + 1;
    timeSheet.addRow(["Year", "Orders", "Completed", "Completion Rate", "Avg Days", "Revenue"]);
    helpers.applyHeaderRow(timeSheet, yearlyTableHeaderRow);
    
    // Calculate yearly statistics
    const yearlyStats = {};
    
    // Initialize with current year and previous years
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear; year++) {
      yearlyStats[year] = {
        orders: 0,
        completed: 0,
        totalDays: 0,
        revenue: 0
      };
    }
    
    // Populate yearly stats
    data.rawData.detailedOrders.forEach(order => {
      if (!order.created_at) return;
      
      const orderYear = new Date(order.created_at).getFullYear();
      
      if (yearlyStats[orderYear]) {
        yearlyStats[orderYear].orders++;
        yearlyStats[orderYear].revenue += Number(order.amount_paid || 0);
        
        if (order.status === 'completed') {
          yearlyStats[orderYear].completed++;
          
          if (order.completed_at) {
            const createdDate = new Date(order.created_at);
            const completedDate = new Date(order.completed_at);
            const days = Math.max(0, Math.ceil((completedDate - createdDate) / (1000 * 60 * 60 * 24)));
            yearlyStats[orderYear].totalDays += days;
          }
        }
      }
    });
    
    // Yearly data starts after header
    const yearlyDataStartRow = yearlyTableHeaderRow + 1;
    
    // Add yearly data rows
    Object.entries(yearlyStats)
      .sort(([a], [b]) => Number(a) - Number(b)) // Sort by year
      .forEach(([year, stats]) => {
        const completionRate = stats.orders > 0 ? (stats.completed / stats.orders * 100) : 0;
        const avgDays = stats.completed > 0 ? (stats.totalDays / stats.completed) : 0;
        
        timeSheet.addRow({
          period: year.toString(),
          orders: Number(stats.orders),
          completed: Number(stats.completed),
          completionRate,
          avgDays: avgDays.toFixed(1),
          revenue: stats.revenue
        });
      });
    
    const yearlyDataEndRow = timeSheet.rowCount;
    
    // Add yearly totals
    helpers.addTotalRow(timeSheet, 6, [2, 3, 5, 6], yearlyDataStartRow, yearlyDataEndRow);
    
    // 8. COURSE PERFORMANCE SHEET
    const courseSheet = workbook.addWorksheet("Course Performance");
    courseSheet.columns = [
      { header: "Course Code", key: "code", width: 15, style: styles.cell },
      { header: "Description", key: "description", width: 30, style: styles.cell },
      { header: "Students", key: "students", width: 15, style: styles.cell },
      { header: "Orders", key: "orders", width: 15, style: styles.cell },
      { header: "Completed", key: "completed", width: 15, style: styles.cell },
      { header: "Completion Rate", key: "completionRate", width: 20, style: styles.percentage },
      { header: "Revenue", key: "revenue", width: 15, style: styles.currency }
    ];
    helpers.applyHeaderRow(courseSheet);
    
    // Course performance data starts at row 2
    const coursePerformanceDataStartRow = 2;
    
    // Prepare course data
    const courseData = {};
    
    // Get course descriptions
    data.rawData.courses.forEach(course => {
      const code = course.course_code || 'Unknown';
      
      courseData[code] = {
        code,
        description: course.description || code,
        students: 0,
        orders: 0,
        completed: 0,
        revenue: 0
      };
    });
    
    // Add student counts
    data.rawData.detailedStudents.forEach(student => {
      const courseCode = student.courses?.course_code || 'Unknown';
      
      if (!courseData[courseCode]) {
        courseData[courseCode] = {
          code: courseCode,
          description: courseCode,
          students: 0,
          orders: 0,
          completed: 0,
          revenue: 0
        };
      }
      
      courseData[courseCode].students++;
    });
    
    // Add order data
    data.rawData.detailedOrders.forEach(order => {
      const courseCode = order.students?.courses?.course_code || 'Unknown';
      
      if (!courseData[courseCode]) {
        courseData[courseCode] = {
          code: courseCode,
          description: courseCode,
          students: 0,
          orders: 0,
          completed: 0,
          revenue: 0
        };
      }
      
      courseData[courseCode].orders++;
      courseData[courseCode].revenue += Number(order.amount_paid || 0);
      
      if (order.status === 'completed') {
        courseData[courseCode].completed++;
      }
    });
    
    // Add course data rows
    Object.values(courseData).forEach(course => {
      const completionRate = course.orders > 0 ? (course.completed / course.orders * 100) : 0;
      
      courseSheet.addRow({
        code: course.code,
        description: course.description,
        students: course.students,
        orders: course.orders,
        completed: course.completed,
        completionRate,
        revenue: course.revenue
      });
    });
    
    const coursePerformanceDataEndRow = courseSheet.rowCount;
    
    // Add course totals
    helpers.addTotalRow(courseSheet, 7, [3, 4, 5, 7], coursePerformanceDataStartRow, coursePerformanceDataEndRow);
    
    // Apply final formatting to all sheets
    workbook.eachSheet(sheet => {
      helpers.autoSizeColumns(sheet);
      helpers.applyAlternatingRows(sheet);
      
      // Ensure all cells have left alignment
      for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        row.eachCell({ includeEmpty: true }, (cell) => {
          if (!cell.style.alignment) {
            cell.style = Object.assign({}, cell.style, { alignment: { horizontal: 'left' } });
          } else {
            cell.style.alignment.horizontal = 'left';
          }
        });
      }
    });
    
    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `richred-analytics-${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
</script>

<div class="min-h-screen bg-muted">
  <!-- New sidebar-based layout -->
  <div class="flex flex-col md:flex-row">
    <!-- Side Panel for Key Metrics -->
    <aside
      class="w-full md:w-80 lg:w-96 bg-white p-5 md:h-screen md:shadow-md md:z-10 md:fixed md:overflow-y-auto"
    >
      <div class="flex items-center gap-3 mb-8 pb-4 border-b">
        <div class="bg-secondary/10 p-2 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5 text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              fill="currentColor"
              d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-800">Dashboard</h1>
          <p class="text-sm text-gray-500">RichRed Clotheshoppe</p>
        </div>
      </div>

      <!-- Export Button -->
      <button
        on:click={generateExcelReport}
        class="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
            clip-rule="evenodd"
          />
        </svg>
        Generate Full Report
      </button>

      <div class="space-y-6 pb-4">
        <!-- Core Metrics -->
        <div>
          <h2
            class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3"
          >
            Core Metrics
          </h2>
          <div class="space-y-3">
            {#each metrics as metric}
              <div
                class="bg-gray-50 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                on:click={() => handleCardClick(metric.type)}
                on:keydown={(e) =>
                  e.key === "Enter" && handleCardClick(metric.type)}
                role="button"
                tabindex="0"
              >
                <div>
                  <p class="text-xs text-gray-500">{metric.title}</p>
                  <p class="text-lg font-bold text-gray-800">{metric.value}</p>
                </div>
                <div
                  class="w-2 h-8 rounded-full bg-gradient-to-b {metric.color}"
                ></div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Time-based Metrics -->
        <div>
          <h2
            class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3"
          >
            Time Metrics
          </h2>
          <div class="space-y-3">
            {#each timeMetrics as metric}
              <div
                class="bg-gray-50 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                on:click={() => handleCardClick(metric.type)}
                on:keydown={(e) =>
                  e.key === "Enter" && handleCardClick(metric.type)}
                role="button"
                tabindex="0"
              >
                <div>
                  <p class="text-xs text-gray-500">{metric.title}</p>
                  <p class="text-lg font-bold text-gray-800">{metric.value}</p>
                </div>
                <div
                  class="w-2 h-8 rounded-full bg-gradient-to-b {metric.color}"
                ></div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Last Updated Info -->
        <div class="text-xs text-center text-gray-500 pt-4 border-t">
          Last updated: {new Date().toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="w-full md:ml-80 lg:ml-96 p-4 md:p-6">
      <!-- Recent Orders - Keep this first -->
      <div class="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <div class="flex justify-between items-center px-6 pt-5 pb-4">
          <h3 class="font-medium text-gray-800">Recent Orders</h3>
          <span
            class="bg-secondary/10 text-secondary text-xs px-3 py-1 rounded-full"
            >5 most recent</span
          >
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead
              class="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              <tr>
                <th class="px-6 py-3 text-left">Student</th>
                <th class="px-6 py-3 text-left">Due Date</th>
                <th class="px-6 py-3 text-left">Status</th>
                <th class="px-6 py-3 text-left">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              {#each data.orderMetrics.recentOrders as order, i}
                <tr class="hover:bg-gray-50 text-sm">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div
                        class="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
                      >
                        {order.student
                          .split(" ")
                          .map((name) => name[0])
                          .join("")}
                      </div>
                      <div class="ml-3">
                        <p class="font-medium text-gray-800">{order.student}</p>
                        <p class="text-xs text-gray-500">
                          {new Date(order.orderedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap"
                    >{new Date(order.dueDate).toLocaleDateString()}</td
                  >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="px-2 py-1 rounded-full text-xs
                      {order.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'in progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'}"
                    >
                      {order.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap font-medium"
                    >{formatCurrency(order.amount)}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Time-based Analytics Controls - Moved below Recent Orders and made sticky -->
      <div
        class="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-xl shadow-sm mb-6 border-grey-300 border-2"
      >
        <h2 class="text-lg font-semibold text-gray-700 mb-2 sm:mb-0">
          Time Analytics
        </h2>
        <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
          <label for="timeframe" class="text-xs text-gray-500"
            >View data by:</label
          >
          <div class="flex bg-gray-100 rounded-lg p-1">
            {#each timeFrames as frame}
              <button
                class="px-3 py-1 text-sm rounded-md {selectedTimeFrame === frame
                  ? 'bg-white shadow-sm text-secondary'
                  : 'text-gray-600'}"
                on:click={() => (selectedTimeFrame = frame)}
              >
                {frame.charAt(0).toUpperCase() + frame.slice(1)}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="space-y-6 ">
        <!-- Revenue Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="bg-white p-5 rounded-xl shadow-sm border-grey-300 border-2">
            <div
              class="flex flex-col sm:flex-row justify-between sm:items-center mb-4"
            >
              <div>
                <h3 class="font-medium text-gray-800">Revenue Trend</h3>
                <p class="text-xs text-gray-500 mt-1">
                  Track revenue patterns over time
                </p>
              </div>
              <select
                bind:value={selectedRevenueType}
                class="mt-2 sm:mt-0 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-secondary focus:border-secondary"
              >
                <option value="order">By Order Date</option>
                <option value="payment">By Payment Date</option>
              </select>
            </div>
            <div class="h-60">
              <canvas bind:this={revenueChartEl}></canvas>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl shadow-sm border-grey-300 border-2">
            <div>
              <h3 class="font-medium text-gray-800">Average Order Value</h3>
              <p class="text-xs text-gray-500 mt-1">
                Average value of orders over time
              </p>
            </div>
            <div class="h-60 mt-4">
              <canvas bind:this={averageOrderValueChartEl}></canvas>
            </div>
          </div>
        </div>

        <div
        class="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-xl shadow-sm mb-6 border-grey-300 border-2"
      >
        <h2 class="text-lg font-semibold text-gray-700 mb-2 sm:mb-0">
          Additional Analytics
        </h2>
      </div>

        <!-- Order Status Section -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="bg-white p-5 rounded-xl shadow-sm">
            <h3 class="font-medium text-gray-800">Order Status</h3>
            <p class="text-xs text-gray-500 mt-1">Distribution by status</p>
            <div class="h-52 mt-4">
              <canvas bind:this={orderStatusChartEl}></canvas>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl shadow-sm">
            <h3 class="font-medium text-gray-800">Payment Status</h3>
            <p class="text-xs text-gray-500 mt-1">
              Payment completion overview
            </p>
            <div class="h-52 mt-4">
              <canvas bind:this={paymentStatusChartEl}></canvas>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl shadow-sm">
            <h3 class="font-medium text-gray-800">Delivery Performance</h3>
            <p class="text-xs text-gray-500 mt-1">On-time vs late deliveries</p>
            <div class="h-52 mt-4">
              <canvas bind:this={completionPerformanceChartEl}></canvas>
            </div>
          </div>
        </div>

        <!-- Student Section -->
        <div class="bg-white p-5 rounded-xl shadow-sm">
          <h3 class="font-medium text-gray-800 mb-1">Students by Course</h3>
          <p class="text-xs text-gray-500">
            Distribution of students across different courses
          </p>
          <div class="h-64 mt-4">
            <canvas bind:this={courseEnrollmentChartEl}></canvas>
          </div>
        </div>

        <!-- Performance Section: Two-column layout -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="bg-white p-5 rounded-xl shadow-sm">
            <h3 class="font-medium text-gray-800 mb-1">Gender Distribution</h3>
            <p class="text-xs text-gray-500">Students by gender</p>
            <div class="h-60 mt-4">
              <canvas bind:this={genderChartEl}></canvas>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl shadow-sm">
            <h3 class="font-medium text-gray-800 mb-1">Weekly Orders</h3>
            <p class="text-xs text-gray-500">Orders received by day of week</p>
            <div class="h-60 mt-4">
              <canvas bind:this={busyDaysChartEl}></canvas>
            </div>
          </div>
        </div>

        <!-- Employee Performance Section: Two-column layout -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="bg-white p-5 rounded-xl shadow-sm">
            <h3 class="font-medium text-gray-800 mb-1">Tailor Performance</h3>
            <p class="text-xs text-gray-500">Orders completed by tailors</p>
            <div class="h-60 mt-4">
              <canvas bind:this={employeePerformanceChartEl}></canvas>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl shadow-sm">
            <h3 class="font-medium text-gray-800 mb-1">Quarterly Revenue</h3>
            <p class="text-xs text-gray-500">Revenue generated by quarter</p>
            <div class="h-60 mt-4">
              <canvas bind:this={quarterlyRevenueChartEl}></canvas>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</div>

<!-- Redesigned Modal Component -->
{#if activeModal && modalData}
  <button
    class="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
    transition:fade
    on:click={closeModal}
  >
    <button
      class="bg-white rounded-xl p-0 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden shadow-xl"
      on:click|stopPropagation
    >
      <div class="bg-secondary/10 px-6 py-4 flex justify-between items-center">
        <h3 class="font-medium text-gray-800">{modalData.title}</h3>
        <button class="text-gray-400 hover:text-gray-600" on:click={closeModal}>
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div class="p-6 overflow-y-auto max-h-[60vh]">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr>
                {#each modalData.columns as column}
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b"
                    >{column}</th
                  >
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each modalData.data as row}
                <tr class="hover:bg-gray-50 border-b border-gray-100">
                  {#each Object.values(row) as cell}
                    <td class="px-4 py-3 text-sm text-gray-900">{cell}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </button>
  </button>
{/if}

<style>
  /* Updated styling for tables */
  table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
  }

  th {
    font-weight: 600;
  }

  /* Smooth transitions */
  .transition-colors {
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;
  }

  /* Chart hover effect */
  canvas {
    transition: filter 0.2s ease;
  }

  canvas:hover {
    filter: brightness(0.98);
  }

  /* Custom scrollbar for better UX */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 10px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .overflow-x-auto {
      -webkit-overflow-scrolling: touch;
    }
  }

  /* Add custom scrollbar styling for the sidebar */
  aside.md\:overflow-y-auto::-webkit-scrollbar {
    width: 4px;
  }

  aside.md\:overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  aside.md\:overflow-y-auto::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 10px;
  }

  aside.md\:overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
</style>
