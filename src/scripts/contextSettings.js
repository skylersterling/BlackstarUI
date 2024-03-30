const fs = require('fs');
const uponTabSelection = new Audio('../audio-files/gui/selectTabSound.wav');

//contextSettings.js

let prefixM, prefixU

function readContextSettingsFromFile() {
  const filePath = '../data/contextSettings.json';

  if (fs.existsSync(filePath)) {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  } else {
    return {
      context1: '',
      topP: 0.5,
      temperature: 1,
      noRepeatNgramSize: 2,
      maxTokens: 512,
      topK: 50,
      bos: '',
      prefixU: 'user:',
      prefixM: 'model:',
      eos: 'user',
    };
  }
}

function writeContextSettingsToFile(contextSettings) {
  const filePath = '../data/contextSettings.json';
  const data = JSON.stringify(contextSettings, null, 2);
  fs.writeFileSync(filePath, data, 'utf-8');
  uponTabSelection.pause();
  uponTabSelection.currentTime = 0;    
  uponTabSelection.play();
}

let contextSettings = readContextSettingsFromFile();

function resetContextSettingsToDefault() {

  uponTabSelection.pause();
  uponTabSelection.currentTime = 0;    
  uponTabSelection.play();

  contextSettings = {
    context1: 'I am a highly intelligent question answering bot. If you ask me a question that is rooted in truth, I will give you the answer. If you ask me a question that is nonsense, trickery, or has no clear answer, I will respond with \"Unknown\".\n\nQ: What is human life expectancy in the United States?\nA: Human life expectancy in the United States is 78 years.\n\nQ: Who was president of the United States in 1955?\nA: Dwight D. Eisenhower was president of the United States in 1955.\n\nQ: Which party did he belong to?\nA: He belonged to the Republican Party.\n\nQ: What is the square root of banana?\nA: Unknown\n\nQ: How does a telescope work?\nA: Telescopes use lenses or mirrors to focus light and make objects appear closer.\n\nQ: Where were the 1992 Olympics held?\nA: The 1992 Olympics were held in Barcelona, Spain.\n\nQ: How many squigs are in a bonk?\nA: Unknown',
    topP: 0.5,
    temperature: 1,
    noRepeatNgramSize: 2,
    maxTokens: 512,
    topK: 50,
    bos: '<|NOT_ASSIGNED|>',
    prefixU: 'Q: ',
    prefixM: 'A: ',
    eos: 'Q',
  };

  writeContextSettingsToFile(contextSettings);
}

function submitContextSettings() {
  contextSettings.context1 = document.getElementById('context1').value;
  contextSettings.topP = document.getElementById('topP').value;
  contextSettings.temperature = document.getElementById('temperature').value;
  contextSettings.noRepeatNgramSize = document.getElementById('noRepeatNgramSize').value;
  contextSettings.maxTokens = document.getElementById('maxTokens').value;
  contextSettings.topK = document.getElementById('topK').value;
  contextSettings.bos = document.getElementById('bos').value;
  contextSettings.prefixU = document.getElementById('prefixU').value;
  contextSettings.prefixM = document.getElementById('prefixM').value;
  contextSettings.eos = document.getElementById('eos').value;
  writeContextSettingsToFile(contextSettings);
  ipcRenderer.send('update-context-settings', contextSettings);
}

function updateSliderValues() {
  const sliders = document.querySelectorAll('.slider-container input[type="range"]');
  const sliderValues = document.querySelectorAll('.slider-container .slider-value');

  sliders.forEach((slider, index) => {
    sliderValues[index].textContent = slider.value;

    slider.addEventListener('input', () => {
      sliderValues[index].textContent = slider.value;
    });
  });
}


module.exports = { contextSettings, readContextSettingsFromFile, writeContextSettingsToFile, resetContextSettingsToDefault, submitContextSettings, updateSliderValues, prefixM, prefixU };
