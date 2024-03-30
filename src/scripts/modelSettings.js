const fs = require('fs');
const uponTabSelection = new Audio('../audio-files/gui/selectTabSound.wav');

async function saveModelSettings() {
  const modelRepository = document.getElementById('modelRepository').value;
  const bitSwitch = document.getElementById('bitSwitch').value;
  const hardwareSwitch = document.getElementById('hardwareSwitch').value;

  uponTabSelection.pause();
  uponTabSelection.currentTime = 0;    
  uponTabSelection.play();

  const modelSettings = {
    modelRepository: modelRepository,
    bitSwitch: parseInt(bitSwitch),
    hardwareSwitch: hardwareSwitch,
    modelPath: modelFilePath || '', // Save an empty string if modelFilePath is not set
    modelConfig: configFilePath || '' // Save an empty string if configFilePath is not set
  };

  // Update modelFilePath and configFilePath with the current values
  modelFilePath = modelSettings.modelPath;
  configFilePath = modelSettings.modelConfig;

  const jsonString = JSON.stringify(modelSettings, null, 2);

  try {
    await fs.promises.writeFile('../data/modelSettings.json', jsonString);
    console.log('Model settings saved successfully');
    ipcRenderer.send('restart-python-process'); // Add this line
  } catch (error) {
    console.error('Error saving model settings:', error);
  }
}


function readModelSettingsFromFile() {
  const filePath = '../data/modelSettings.json';

  if (fs.existsSync(filePath)) {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  } else {
    return {
      modelRepository: "EleutherAI/Pythia-1B-deduped",
      bitSwitch: 2,
      hardwareSwitch: "cpu",
      modelPath: "",
      modelConfig: "",
    };
  }
}

function resetModelSettings() {

  uponTabSelection.pause();
  uponTabSelection.currentTime = 0;    
  uponTabSelection.play();
  
  return {
    modelRepository: "EleutherAI/Pythia-1B-deduped",
    bitSwitch: 2,
    hardwareSwitch: "cpu",
    modelPath: "",
    modelConfig: "",
  };
}

async function clearModelSettings() {
  const modelSettings = readModelSettingsFromFile();
  modelSettings.modelPath = '';
  modelSettings.modelConfig = '';

  const jsonString = JSON.stringify(modelSettings, null, 2);

  try {
    await fs.promises.writeFile('../data/modelSettings.json', jsonString);
    console.log('Model settings cleared successfully');
  } catch (error) {
    console.error('Error clearing model settings:', error);
  }
}



module.exports = {
  saveModelSettings,
  readModelSettingsFromFile,
  resetModelSettings,
  clearModelSettings
};
