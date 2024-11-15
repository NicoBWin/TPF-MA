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
            duration: 150, // Reduce animation for faster updates
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
                    text: 'Distance (cm)'
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
    
    for (let i = 1; i < dataSize; i++) {
        // Calculate speed (difference in angle over time)
        let speed = (angles[i] - angles[i - 1]) / timeInterval; // Assuming time step is 0.01 seconds
        speeds.push(speed);
        
        // Calculate acceleration (difference in speed over time)
        if (i > 1) {
            let acceleration = (speeds[i - 1] - speeds[i - 2]) / timeInterval; // Assuming time step is 0.01 seconds
            accelerations.push(acceleration);
        } else {
            accelerations.push(0); // Acceleration is zero at the first data point
        }
    }
    updateChart();
}

// Process the incoming data from the WebSocket
function processCommand(event) {
    var obj = JSON.parse(event.data);
    var type = obj.type;
    if (type.localeCompare("graph_update") == 0) {
        // Obj.value contains an array of angles
        angles = obj.value;

        // Recalculate speed and acceleration based on the angle data
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
