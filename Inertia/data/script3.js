const timeInterval = 0.01; // Time interval in seconds between data points

// Chart setup
var distanceValues = [];
var speedValues = [];
let ctx = document.getElementById('myChart').getContext('2d');
let myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array.from({ length: 20 }, (_, i) => (i * timeInterval).toFixed(2)), // Limited to 20 points for example
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
                backgroundColor: 'rgba(255, 99, 132, 0.1)', // Reduced opacity
                borderColor: 'rgba(255, 99, 132, 0.6)', // Less intense border color
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
                ticks: {
                    stepSize: 0.1
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
                position: 'left'
            },
            y1: {
                title: {
                    display: true,
                    text: 'Speed (cm/s)'
                },
                beginAtZero: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false
                }
            }
        }
    }
});

// Sample data for distance
const sampleDistances = [10, 10.5, 11, 11.7, 12.1, 13, 13.8, 14.3, 15, 15.5, 16, 16.7, 17.1, 17.8, 18.3, 19, 19.5, 20, 20.5, 21];

// Calculate speed based on distance
sampleDistances.forEach((distance, i) => {
    distanceValues.push(distance);

    if (i === 0) {
        speedValues.push(0); // Initial speed is zero
    } else {
        const previousDistance = sampleDistances[i - 1];
        const speed = (distance - previousDistance) / timeInterval;
        speedValues.push(speed);
    }
});

// Update chart to show the example data
myChart.update();
