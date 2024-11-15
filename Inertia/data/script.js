var Socket;
const timeInterval = 0.005; // Time interval in seconds between data points
const dataSize = 3001; // Time interval in seconds between data points

function init() {
    Socket = new WebSocket('ws://' + window.location.hostname + ':81/');
    Socket.onmessage = function(event) {
        processCommand(event);
    };
}

// Initialize arrays for angle, speed, and acceleration
var angles = [];
var speeds = [];
var accelerations = [];

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
                max: dataSize-1,
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
                suggestedMin: 1,
                ticks: {
                    callback: function(value) {
                        return value.toFixed(1);
                    }
                },
                position: 'left' // Distance on the left Y-axis
            },
            y1: {
                title: {
                    display: true,
                    text: 'Velocidad rotacional (rad/s)'
                },
                beginAtZero: true,
                suggestedMin: 0,
                ticks: {
                    callback: function(value) {
                        return value.toFixed(1);
                    }
                },
                position: 'right', // Speed on the right Y-axis
                grid: {
                    drawOnChartArea: false // Prevent grid lines from overlapping
                }
            },
            y2: {
                title: {
                    display: true,
                    text: 'Aceleración (rad/s²)'
                },
                beginAtZero: true,
                suggestedMin: 0,
                ticks: {
                    callback: function(value) {
                        return value.toFixed(1);
                    }
                },
                position: 'right', // Speed on the right Y-axis
                grid: {
                    drawOnChartArea: false // Prevent grid lines from overlapping
                }
            }
        }
    }
});

// Button Actions to plot different datasets
document.getElementById('PLAY').addEventListener('click', () => {
    var msg = { type: 'PLAY', value: 1 };
    Socket.send(JSON.stringify(msg));
});

document.getElementById('RESET').addEventListener('click', () => {
    var msg = { type: 'RESET', value: 0 };
    Socket.send(JSON.stringify(msg));
});

// Function to update the chart with new data
function updateChart() {
    myChart.data.datasets[0].data = angles;
    myChart.data.datasets[1].data = speeds;
    myChart.data.datasets[2].data = accelerations;
    myChart.update();
}

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

    speeds = movingAverage(speeds, 20);
    accelerations = movingAverage(accelerations, 20);

    speeds = imputeOutliersWithNeighbors(speeds, 2);
    accelerations = imputeOutliersWithNeighbors(accelerations, 1);
    updateChart();
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

function imputeOutliersWithNeighbors(data, threshold) {
    let mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    let stdDev = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);

    return data.map((value, index) => {
        if (Math.abs(value - mean) > threshold * stdDev) {
            // Check if neighbors exist
            let prev = index > 0 ? data[index - 1] : value; // previous value or current if first element
            let next = index < data.length - 1 ? data[index + 1] : value; // next value or current if last element
            let average = (prev + next) / 2;
            return average; // Replace with the average of the previous and next value
        }
        return value; // Return original value if not an outlier
    });
}

// Process the incoming data from the WebSocket
function processCommand(event) {
    var obj = JSON.parse(event.data);
    var type = obj.type;
    if (type.localeCompare("graph_update") == 0) {
        // Obj.value contains an array of angles
        angles = obj.value;

        // Calculate speed and acceleration based on the angle data
        calculateSpeedAndAcceleration();
    }
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
    const csvContent = "data:text/csv;charset=utf-8,Tiempo (segundos),Angulo (rads),Velocidad (rad/s),Aceleración (rad/s²)\n"
        + angles.map((label, i) => `${label},${angles[i]},${speeds[i] || 0},${accelerations[i] || 0}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
});

// Initialize the WebSocket and chart on page load
window.onload = function(event) {
    init();
}
