var Socket;
  
function init() {
    Socket = new WebSocket('ws://' + window.location.hostname + ':81/');
    Socket.onmessage = function(event) {
        processCommand(event);
    };
}

// Set up the initial chart with time (0-20 seconds) on the X-axis and distance (cm) on the Y-axis
var yValues = [];
let ctx = document.getElementById('myChart').getContext('2d');
let myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array.from({ length: 1501 }, (_, i) => (i * 0.01).toFixed(2)),
        datasets: [{
            label: 'Angulo (rad)',
            data: yValues,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            fill: false,
            pointRadius: 0
        }]
    },
    options: {
        animation: {
            duration: 150, // Reduce the animation duration for faster updates
            easing: 'linear' // Use a linear easing function for a smooth and quick transition
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Tiempo (segundos)'
                },
                beginAtZero: true,
                max: 1500,
                ticks: {
                    stepSize: 0.01
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
                suggestedMin: 1,  // Ensures the Y-axis stays above 0
                ticks: {
                    callback: function(value) {
                        return value.toFixed(1); // Ensures values are displayed with one decimal place
                    }
                }
            }
        }
    }
});

// Button Actions to plot different datasets
document.getElementById('PLAY').addEventListener('click', () => {
    var msg = { type: 'PLAY', value: 1};
	Socket.send(JSON.stringify(msg));
});

document.getElementById('RESET').addEventListener('click', () => {
    var msg = { type: 'RESET', value: 0};
	Socket.send(JSON.stringify(msg));
});

// Function to update the chart with new data
function updateChart(data, label) {
    myChart.data.datasets[0].data = data;
    myChart.data.datasets[0].label = label;
    myChart.update();
}

// Process the incoming data from the WebSocket
function processCommand(event) {
    var obj = JSON.parse(event.data);
    var type = obj.type;
    if (type.localeCompare("graph_update") == 0) {
        console.log(obj.value);
        myChart.data.datasets[0].data = obj.value;
        myChart.update();
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
    const csvContent = "data:text/csv;charset=utf-8,Tiempo (segundos),Angulo (rads)\n" // Add header row
        + myChart.data.labels.map((label, i) => `${label},${myChart.data.datasets[0].data[i]}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
});

//--------------------------------------
window.onload = function(event) {
    init();
}