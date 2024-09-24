const ignoreQuestions = [
    "ID", "Hora de início", "Hora de conclusão", "Email", "Nome", "Hora da última modificação"
];

const ignoreWords = [
    "na", "um", "por", "meu", "seu", "em", "de", "do", "da", "o", "a", "e", "é", "os", "as",
    "que", "não", "quero", "responder", "prefiro", "número", "números", "para", "com", "ao",
    "nos", "sobre", "sem", "aos", "das", "dos", "minha", "uma", "uns", "umas", "no", "na",
    "nas", "entre", "ou", "mas", "porque", "se", "eu", "tu", "ele", "ela", "nós", "vós",
    "eles", "elas", "teu", "nosso", "vosso", "este", "essa", "isso", "aquilo", "ser", "estar",
    "ter", "haver", "fazer", "ir", "vir", "querer", "sim", "já", "ainda", "muito", "pouco",
    "mais", "menos", "todos", "cada", "qualquer", "vezes", "primeiro", "segundo", "dois", "três",
    "meu", "teu", "meus", "minhas", "me", "te", "lhe", "nossos", "suas", "nos", "teu", "seus",
    "ela", "dele", "dela", "sobre", "agora", "ano", "mês", "dia", "semana", "quando", "depois", 
    "antes", "era", "fui", "estava", "tive", "fiz", "tenho", "não", "ruim", "foi", "outra"
];

let chartInstance;

document.getElementById('fileInput').addEventListener('change', function(e) {
    let file = e.target.files[0];
    let reader = new FileReader();
    
    reader.onload = function(e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, { type: 'array' });
        let firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        let sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        generateMenu(sheetData);
    };

    reader.readAsArrayBuffer(file);
});

function generateMenu(data) {
    let menuDiv = document.getElementById('menu');
    menuDiv.innerHTML = '<h3 id="questionTitle">Escolha uma Pergunta:</h3><ul id="questionList"></ul>';
    let questionList = document.getElementById('questionList');

    data[0].forEach((enunciado, index) => {
        if (ignoreQuestions.includes(enunciado)) return;

        let responses = data.slice(1).map(row => row[index]).filter(Boolean);

        let listItem = document.createElement('li');
        listItem.textContent = enunciado;
        listItem.onclick = () => displayQuestion(enunciado, responses);
        questionList.appendChild(listItem);
    });
}

function displayQuestion(question, responses) {
    let chart = document.getElementById('myChart');
    let wordCloud = document.getElementById('wordCloud');
    let chartTitle = document.getElementById('chartTitle');
    
    chartTitle.textContent = question;
    chartTitle.classList.remove('hidden');

    let multipleChoiceResponses = responses.flatMap(response => {
        response = response ? String(response).trim() : '';
        if (response.includes(';')) {
            return response.split(';').map(r => r.trim());
        } else {
            return [response];
        }
    }).filter(response => response !== '');

    if (isDateQuestion(question)) {
        const categorizedData = categorizeDates(question, multipleChoiceResponses);
        chart.style.display = 'block';
        wordCloud.style.display = 'none';
        displayPieChart(categorizedData);
    } else if (isMultipleChoice(multipleChoiceResponses, responses)) {
        chart.style.display = 'block';
        wordCloud.style.display = 'none';
        displayPieChart(multipleChoiceResponses);
    } else {
        chart.style.display = 'none';
        wordCloud.style.display = 'block';
        generateWordCloud(multipleChoiceResponses);
    }
}

function isDateQuestion(question) {
    const dateKeywords = ["data", "nascimento"];
    return dateKeywords.some(keyword => question.toLowerCase().includes(keyword));
}

function categorizeDates(question, dateResponses) {
    if (question.toLowerCase().includes('nascimento')) {
        return categorizeByAge(dateResponses);
    } else {
        return categorizeByYear(dateResponses);
    }
}

function parseDate(dateString) {
    if (!isNaN(dateString) && Number(dateString) > 25569) {
        return new Date((Number(dateString) - 25569) * 86400 * 1000);
    }

    const formats = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "MM-DD-YYYY"];
    let parsedDate = moment(dateString, formats, true);

    if (parsedDate.isValid()) {
        return parsedDate.toDate();
    } else {
        return null;
    }
}

function categorizeByYear(dateResponses) {
    let yearGroups = [];

    dateResponses.forEach(date => {
        let parsedDate = parseDate(date);
        if (parsedDate) {
            let year = parsedDate.getFullYear();
            yearGroups.push(year);
        }
    });

    return yearGroups;
}


function categorizeByAge(birthDates) {
    let currentYear = new Date().getFullYear();
    let ageGroups = [];

    birthDates.forEach(date => {
        let parsedDate = parseDate(date);
        if (parsedDate) {
            let birthYear = parsedDate.getFullYear();
            let age = currentYear - birthYear;

            if (age <= 17){
                ageGroups.push("-18 anos");
            }
            else if (age >= 18 && age <= 25) {
                ageGroups.push("18-25 anos");
            } else if (age >= 26 && age <= 35) {
                ageGroups.push("26-35 anos");
            } else if (age >= 36 && age <= 45) {
                ageGroups.push("36-45 anos");
            } else if (age >= 46 && age <= 55) {
                ageGroups.push("46-55 anos");
            } else if (age >= 56) {
                ageGroups.push("56+ anos");
            }
        }
    });
    return ageGroups;
}

function isMultipleChoice(flatResponses, originalResponses) {
    if (originalResponses.some(r => typeof r === 'string' && r.includes(';'))) {
        return true;
    }

    let uniqueResponses = [...new Set(flatResponses)];
    return uniqueResponses.length <= 10;
}

function displayPieChart(responses) {
    let ctx = document.getElementById('myChart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    let responseCounts = responses.reduce((acc, response) => {
        acc[response] = (acc[response] || 0) + 1;
        return acc;
    }, {});

    let labels = Object.keys(responseCounts);
    let data = Object.values(responseCounts);
    let colors = [
        '#36A2EB', '#E74C3C', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#FF6384', '#8E44AD', '#3498DB', '#1ABC9C', '#F1C40F', '#2ECC71'
    ];
    

    chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: '# de votos',
                data: data,
                backgroundColor: colors.slice(0, labels.length)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

}

function generateWordCloud(responses) {
    let wordCounts = {};

    responses.forEach(response => {
        let words = response.split(/\s+/);
        words.forEach(word => {
            word = word.toLowerCase().replace(/[^\w\s]/g, '');
            if (!ignoreWords.includes(word) && isNaN(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
    });

    let wordCloudContainer = document.getElementById('wordCloud');
    wordCloudContainer.innerHTML = '';

    let wordSpans = [];
    let centerX = wordCloudContainer.offsetWidth / 2;
    let centerY = wordCloudContainer.offsetHeight / 2;

    Object.entries(wordCounts).forEach(([word, count]) => {
        if (word.trim().length > 0) {
            let span = document.createElement('span');
            let fontSize = Math.min(30, 10 + count * 2);
            span.style.fontSize = fontSize + 'px';
            span.style.position = 'absolute';
            span.style.transform = `rotate(${Math.random() * 30 - 15}deg)`;
            span.textContent = word + ' ';
            wordSpans.push(span);
            wordCloudContainer.appendChild(span);
        }
    });

    let spiralFactor = 20;
    let angle = 0;

    wordSpans.forEach((span, index) => {
        let radius = spiralFactor * Math.sqrt(index);
        let x = centerX + radius * Math.cos(angle) - span.offsetWidth / 2;
        let y = centerY + radius * Math.sin(angle) - span.offsetHeight / 2;

        span.style.left = `${x}px`;
        span.style.top = `${y}px`;

        angle += 0.5;
    });
}

document.querySelector('.botao-upload').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});