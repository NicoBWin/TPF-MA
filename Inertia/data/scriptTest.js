var Socket;
const timeInterval = 0.01; // Time interval in seconds between data points
const dataSize = 1501; // Total number of data points

// Coefficients for the quadratic equation: θ(t) = a*t^2 + b*t + c
const a = 1, b = 0.1, c = 0;

// Initialize arrays for angle, speed, and acceleration
var angles = [];
var speeds = [];
var accelerations = [];

// Generate angle data as a quadratic function
for (let i = 0; i < dataSize; i++) {
    let t = i * timeInterval;
    angles.push(a * t ** 2 + b * t + c);
}

let ctx = document.getElementById('myChart').getContext('2d');
let myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array.from({ length: dataSize }, (_, i) => (i * timeInterval).toFixed(2)),
        datasets: [
            {
                label: 'Angulo (rad)',
                data: angles,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                fill: false,
                pointRadius: 1,
                yAxisID: 'y'
            },
            {
                label: 'Velocidad rotacional (rad/s)',
                data: speeds,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                fill: false,
                pointRadius: 0,
                yAxisID: 'y1'
            },
            {
                label: 'Aceleración (rad/s²)',
                data: accelerations,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false,
                pointRadius: 0,
                yAxisID: 'y2'
            }
        ]
    },
    options: {
        animation: {
            duration: 250, // Reduce animation for faster updates
            easing: 'linear' // Linear easing for smooth updates
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Tiempo (segundos)'
                },
                beginAtZero: true,
                max: dataSize - 1,
                ticks: {
                    stepSize: timeInterval
                },
                grid: {
                    color: 'rgba(200, 200, 200, 0.5)',
                    lineWidth: 1
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Angulo (rad)'
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return value.toFixed(1);
                    }
                },
                position: 'left'
            },
            y1: {
                title: {
                    display: true,
                    text: 'Velocidad rotacional (rad/s)'
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return value.toFixed(1);
                    }
                },
                position: 'right',
                grid: {
                    drawOnChartArea: false
                }
            },
            y2: {
                title: {
                    display: true,
                    text: 'Aceleración (rad/s²)'
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return value.toFixed(1);
                    }
                },
                position: 'right',
                grid: {
                    drawOnChartArea: false
                }
            }
        }
    }
});

// Function to calculate speed and acceleration from angle data
function calculateSpeedAndAcceleration() {
    speeds = [];
    accelerations = [];

    for (let i = 1; i < dataSize - 1; i++) {
        // Calculate speed (difference in angle over time)
        let speed = (angles[i + 1] - angles[i - 1]) / (2 * timeInterval);
        speeds.push(speed);

        // Calculate acceleration (difference in speed over time)
        if (i > 1) {
            let acceleration = (speeds[i - 1] - speeds[i - 2]) / timeInterval;
            accelerations.push(acceleration);
        } else {
            accelerations.push(0);
        }
    }
    updateChart();
}

// Update chart with calculated data
function updateChart() {
    myChart.data.datasets[1].data = speeds;
    myChart.data.datasets[2].data = accelerations;
    myChart.update();
}

// Initialize the calculations and update the chart
calculateSpeedAndAcceleration();
