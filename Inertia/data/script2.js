var Socket;
const timeInterval = 0.01; // Time interval in seconds between data points

function init() {
    Socket = new WebSocket('ws://' + window.location.hostname + ':81/');
    Socket.onmessage = function(event) {
        processCommand(event);
    };
}

// Chart setup
var distanceValues = [];
var speedValues = [];
let ctx = document.getElementById('myChart').getContext('2d');
let myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array.from({ length: 1501 }, (_, i) => (i * timeInterval).toFixed(2)),
        datasets: [
            {
                label: 'Distance (cm)',
                data: distanceValues,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                fill: false,
                pointRadius: 0,
                yAxisID: 'y'
            },
            {
                label: 'Speed (cm/s)',
                data: speedValues,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                fill: false,
                pointRadius: 0,
                yAxisID: 'y1'
            }
        ]
    },
    options: {
        animation: {
            duration: 150,
            easing: 'linear'
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time (seconds)'
                },
                beginAtZero: true,
                max: 15,
                ticks: {
                    stepSize: 0.5
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
                    text: 'Speed (cm/s)'
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

// Process incoming WebSocket data
function processCommand(event) {
    var obj = JSON.parse(event.data);
    var type = obj.type;

    if (type === "graph_update") {
        var newDistance = obj.value;

        // Calculate speed if we have at least one previous distance point
        if (distanceValues.length > 0) {
            const previousDistance = distanceValues[distanceValues.length - 1];
            const speed = (newDistance - previousDistance) / timeInterval;
            speedValues.push(speed);
        } else {
            speedValues.push(0); // Initial speed is zero if it's the first point
        }

        // Update distance values with the new distance
        distanceValues.push(newDistance);

        // Update the chart with new data
        updateChart();
    }
}

// Update the chart with the latest distance and speed data
function updateChart() {
    myChart.data.datasets[0].data = distanceValues;
    myChart.data.datasets[1].data = speedValues;
    myChart.update();
}

// Button Actions to plot different datasets
document.getElementById('PLAY').addEventListener('click', () => {
    var msg = { type: 'PLAY', value: 1};
    Socket.send(JSON.stringify(msg));
});

document.getElementById('RESET').addEventListener('click', () => {
    var msg = { type: 'RESET', value: 0};
    Socket.send(JSON.stringify(msg));
});

// Download chart as PNG
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
    const csvContent = "data:text/csv;charset=utf-8,Time (seconds),Distance (cm),Speed (cm/s)\n" 
        + myChart.data.labels.map((label, i) => `${label},${distanceValues[i] || ""},${speedValues[i] || ""}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Initialize the WebSocket and chart on page load
window.onload = function(event) {
    init();
}
