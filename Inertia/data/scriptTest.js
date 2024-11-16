var Socket;
const timeInterval = 0.005; // Time interval in seconds between data points
const dataSize = 3001; // Total number of data points

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
        labels: Array.from({ length: dataSize-450}, (_, i) => (i * timeInterval).toFixed(2)),
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
    //Filter Speed
    angles = movingAverage(angles, 200);


    for (let i = 1; i < dataSize - 1; i++) {
        // Calculate speed (difference in angle over time)
        let speed = (angles[i + 1] - angles[i - 1]) / (2 * timeInterval);
        speeds.push(speed);
    }
    // Filter Speed
    speeds = zeroPhaseMovingAverage(speeds, 150);

    for (let i = 1; i < dataSize - 1; i++) {
        // Calculate acceleration (difference in speed over time)
        let acceleration = (speeds[i + 1] - speeds[i - 1]) / (2 * timeInterval);
        accelerations.push(acceleration);
    }
    accelerations = zeroPhaseMovingAverage(accelerations, 150);
    updateChart();
}

function zeroPhaseMovingAverage(data, windowSize) {
    // Forward pass: apply the moving average filter
    let forwardPass = movingAverage(data, windowSize);
    
    // Backward pass: reverse the array, apply the filter, and reverse again
    let backwardPass = movingAverage(forwardPass.reverse(), windowSize).reverse();
    
    return backwardPass;
}

function movingAverage(data, windowSize) {
    let result = [];
    for (let i = 0; i < data.length; i++) {
        let start = Math.max(0, i - Math.floor(windowSize / 2));
        let end = Math.min(data.length, i + Math.ceil(windowSize / 2));
        let window = data.slice(start, end);
        result.push(window.reduce((sum, val) => sum + val, 0) / window.length);
    }
    return result;
}

// Update chart with calculated data
function updateChart() {
    myChart.data.datasets[1].data = speeds;
    myChart.data.datasets[2].data = accelerations;
    myChart.update();
}

// Download chart as image (PNG)
document.getElementById('downloadGraph').addEventListener('click', () => {
    html2canvas(document.getElementById('myChart')).then(canvas => {
        let link = document.createElement('a');
        link.download = 'graph.png';
        link.href = canvas.toDataURL();
        link.click();
    });
});

// Download data as CSV with headers
document.getElementById('downloadCSV').addEventListener('click', function() {
    const csvContent = "data:text/csv;charset=utf-8,Time (segundos),Angle (rads),Speed (rad/s),Aceleration (rad/s^2)\n"
        + angles.map((label, i) => `${label},${angles[i]},${speeds[i] || 0},${accelerations[i] || 0}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
});

// Initialize the calculations and update the chart
calculateSpeedAndAcceleration();
