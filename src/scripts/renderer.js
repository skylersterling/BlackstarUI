//imports.section

const fs = require('fs');
const { ipcRenderer } = require('electron');
let { contextSettings, readContextSettingsFromFile, writeContextSettingsToFile, resetContextSettingsToDefault, submitContextSettings, updateSliderValues, prefixM, prefixU } = require('../scripts/contextSettings.js');
const { saveModelSettings, readModelSettingsFromFile, resetModelSettings, clearModelSettings } = require('../scripts/modelSettings.js');
const path = require('path');
const uponTabSelection = new Audio('../audio-files/gui/selectTabSound.wav');
const uponSendSelection = new Audio('../audio-files/gui/sendMessageSound.wav');
const responseSound = new Audio('../audio-files/gui/receiveMessageSound.wav');

//variables.section

let UserPronoun = contextSettings.prefixU;
let chatHistory = '';
let ModelPronoun = contextSettings.prefixM;
let eos = contextSettings.eos;
let bos = contextSettings.bos;
let userInput = document.getElementById("user_input");
let sendButton = document.getElementById("send-button");
let isScriptRunning = false;
let modelSettings = readModelSettingsFromFile();
let modelFilePath = modelSettings.modelPath;
let configFilePath = modelSettings.modelConfig;
let userScrolledUp = false;

//functionality.section

function handleBoxClick(event) {
  const boxContent = event.target.textContent;
  const inputField = document.getElementById('user_input');
  inputField.value = boxContent;
  sendButton.classList.remove("unclickable");
  sendButton.disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
  const boxes = document.querySelectorAll('.box');
  boxes.forEach(box => {
    box.addEventListener('click', handleBoxClick);
  });
});

function getTextWidth(text, font) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

const chatWindow = document.getElementById("chat-window");
chatWindow.addEventListener("scroll", () => {
  const isAtBottom = chatWindow.scrollHeight - chatWindow.scrollTop === chatWindow.clientHeight;
  if (!isAtBottom) {
    userScrolledUp = true;
  } else {
    userScrolledUp = false;
  }
});

function resetContext() {
  chatHistory = '';
  const chatWindow = document.getElementById("chat-window");
  while (chatWindow.firstChild) {
    chatWindow.removeChild(chatWindow.firstChild);
  }
  const group = document.getElementById('placeholder-boxes');
  group.style.display = 'flex';
}

function scrollToBottom(element) {
  element.scrollTo({
    top: element.scrollHeight,
    behavior: 'auto'
  });
}

function scrollToBottomSmooth(element) {
  element.scrollTo({
    top: element.scrollHeight,
    behavior: 'smooth'
  });
}

function displayChatMessage(message, sender) {
  const chatWindow = document.getElementById("chat-window");
  const messageDiv = document.createElement("div");
  messageDiv.classList.add(sender + '-message');
  
  const profilePicture = document.createElement("img");
  let profilePicturePath = "";
  let fallbackPicturePath = "";

  if (sender === 'chatbot-response') {
    messageDiv.classList.add('chatbot-response-message');
    profilePicturePath = "../graphics/pfp/pfpModel.png";
    fallbackPicturePath = "../graphics/pfpModel.png";
    profilePicture.alt = "Chatbot profile picture";
  } else if (sender === 'user') {
    messageDiv.classList.add('user-message');
    profilePicturePath = "../graphics/pfp/pfpUser.png";
    fallbackPicturePath = "../graphics/pfpUser.png";
    profilePicture.alt = "User profile picture";
  }

  fetch(profilePicturePath)
    .then(response => {
      if (response.ok) {
        profilePicture.src = profilePicturePath;
      } else {
        profilePicture.src = fallbackPicturePath;
      }
    })
    .catch(() => {
      profilePicture.src = fallbackPicturePath;
    });

  messageDiv.appendChild(profilePicture);

  const messageParagraph = document.createElement("p");
  messageParagraph.textContent = message;

  messageDiv.appendChild(messageParagraph);
  chatWindow.appendChild(messageDiv);

  const placeholderBoxes = document.getElementById('placeholder-boxes');
  if (placeholderBoxes.style.display !== 'none') {
    placeholderBoxes.style.display = 'none';
  }
  if (!userScrolledUp) {
    scrollToBottomSmooth(chatWindow);
  }
}


function ChatBotAction(user_input) {
  uponSendSelection.play();
  console.log("Renderer Initialized");
  displayChatMessage(user_input, 'user');
  chatHistory += " " + UserPronoun + " " + user_input + " " + ModelPronoun + " ";
  document.getElementById("user_input").value = '';
  displayChatMessage('', 'chatbot-response');

  const cleanedChatHistory = chatHistory.replace(/\|\|\|/g, '');
  console.log(cleanedChatHistory);

  ipcRenderer.send('run-python-script', cleanedChatHistory);
  sendButton.classList.add("unclickable");
  sendButton.disabled = true;
  isScriptRunning = true;
  toggleStopGenerationButton(true);
}

function toggleStopGenerationButton(visible) {
  const stopGenerationButton = document.getElementById("stop-generation-button");
  if (visible) {
    stopGenerationButton.classList.remove("hidden");
  } else {
    stopGenerationButton.classList.add("hidden");
  }
}

//sendButton.js

function updateSendButtonState() {
  const trimmedValue = userInput.value.trim();
  if (trimmedValue === "" || isScriptRunning) {
    sendButton.classList.add("unclickable");
    sendButton.disabled = true;
  } else {
    sendButton.classList.remove("unclickable");
    sendButton.disabled = false;
  }
}

userInput.addEventListener("input", () => {
  updateSendButtonState();
});

//eventListener.section

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!sendButton.disabled) {
      ChatBotAction(userInput.value);
    }
  }
});

const input = document.getElementById('user_input');

//WIP

input.addEventListener('keydown', (e) => {

  if (e.shiftKey && e.key === 'Enter') {
    e.preventDefault(); 
    // I will add newline behavior once i get free time.
  }
});

const resetContextButton = document.getElementById('reset-context-button');
resetContextButton.addEventListener('click', () => {
  resetContext();
  uponTabSelection.play();
});


const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    uponTabSelection.pause();
    uponTabSelection.currentTime = 0;    
    uponTabSelection.play();

    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    handleTabClick(tab.textContent.trim().toLowerCase().replace(' ', '-'));
  });
});

ipcRenderer.on('python-process-restarted', () => {
  isScriptRunning = false;
  updateSendButtonState();
  toggleStopGenerationButton(false); // Hide the "stop generation" button
});


const stopGenerationButton = document.getElementById("stop-generation-button");
stopGenerationButton.addEventListener('click', () => {
  ipcRenderer.send('restart-python-process');
});


const toggleThemeButton = document.getElementById('toggle-theme-button');
toggleThemeButton.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');

  uponTabSelection.pause();
  uponTabSelection.currentTime = 0;    
  uponTabSelection.play();
});

//interProcessCommunication.section

ipcRenderer.send('update-context-settings', contextSettings);

ipcRenderer.on('python-script-response', (event, response) => {
  console.log(response);
  console.log("Finished");
  const chatWindow = document.getElementById("chat-window");
  const lastMessageDiv = chatWindow.lastChild;
  const tokens = response.split('|||');
  const newToken = tokens[tokens.length - 2];

  if (newToken) {
    chatHistory += newToken;
    if (lastMessageDiv && lastMessageDiv.classList.contains('chatbot-response-message')) {
      const messageParagraph = lastMessageDiv.lastChild;
      const previousText = messageParagraph.textContent;
      messageParagraph.textContent += newToken;

      // Check for overflow and scroll down if needed
      const messageFont = window.getComputedStyle(messageParagraph).font;
      const messageWidth = getTextWidth(messageParagraph.textContent, messageFont);
      const chatWindowWidth = chatWindow.clientWidth;
      if (messageWidth > chatWindowWidth && !userScrolledUp) {
        scrollToBottom(chatWindow);
      }
    }
  }

  if (response.includes('endSignal')) {
    responseSound.play();
    isScriptRunning = false;
    updateSendButtonState();
    toggleStopGenerationButton(false); 
  }
});

//navigator.section

function handleTabClick(tabName) {
  const contentContainer = document.getElementById('content-container');
  const chatContainer = document.getElementById('chat-container');

  toggleInferenceTab(tabName);
  updateContent(tabName);

  function toggleInferenceTab(tabName) {
    if (tabName === 'inference') {
      chatContainer.classList.remove('hidden');
      contentContainer.classList.add('hidden');
    } else {
      chatContainer.classList.add('hidden');
      contentContainer.classList.remove('hidden');
    }
  }

  function updateContent(tabName) {
    if (tabName === 'context') {
      updateContextSettingsContent();
    } else if (tabName === 'model') {
      updateLoadModelContent();
    } else if (tabName === 'customize') {
      updateCustomizationToolsContent();
    } else if (tabName === 'merge-model') {
      updateMergeModelContent();
    } else if (tabName === 'about') {
      updateAboutContent();
    }
  }

  function updateAboutContent() {
    fs.readFile(path.join(__dirname, '../content/about.html'), 'utf8', function(err, data) {
      if (err) {
        console.error(err);
        return;
      }
      let html = data;
      contentContainer.innerHTML = html;
    });
  }

  function updateContextSettingsContent() {
    contextSettings = readContextSettingsFromFile();
      fs.readFile(path.join(__dirname, '../content/context-settings.html'), 'utf8', function(err, data) {
        if (err) {
          console.error(err);
          return;
        }
        let html = data;
        for (let key in contextSettings) {
          html = html.replace(new RegExp(`\\$\\{contextSettings.${key}\\}`, 'g'), contextSettings[key]);
        }
        contentContainer.innerHTML = html;

        document.getElementById('default-button').addEventListener('click', () => {
          resetContextSettingsToDefault();
     
          handleTabClick('context');
        });
        updateSliderValues();
        document.getElementById('submit-context-button').addEventListener('click', submitContextSettings);
      });
  }

  function updateLoadModelContent() {
      modelSettings = readModelSettingsFromFile();
  
      fs.readFile(path.join(__dirname, '../content/load-model.html'), 'utf8', function(err, data) {
        if (err) {
          console.error(err);
          return;
        }
        let html = data;
        html = html.replace(new RegExp(`\\$\\{modelSettings.modelRepository\\}`, 'g'), modelSettings.modelRepository);
        html = html.replace(new RegExp(`\\$\\{getBitMessage(modelSettings.bitSwitch)\\}`, 'g'), getBitMessage(modelSettings.bitSwitch));
        html = html.replace(new RegExp(`\\$\\{modelSettings.bitSwitch\\}`, 'g'), modelSettings.bitSwitch);
        html = html.replace(new RegExp(`\\$\\{modelSettings.hardwareSwitch === 'cpu' ? 'selected' : ''\\}`, 'g'), modelSettings.hardwareSwitch === 'cpu' ? 'selected' : '');
        html = html.replace(new RegExp(`\\$\\{modelSettings.hardwareSwitch === 'cuda' ? 'selected' : ''\\}`, 'g'), modelSettings.hardwareSwitch === 'cuda' ? 'selected' : '');
        contentContainer.innerHTML = html;
        document.getElementById('bitMessage').innerText = getBitMessage(modelSettings.bitSwitch);

  
        updateButtonStatus();
        updateClearButtonState();
        document.getElementById('bitSwitch').value = modelSettings.bitSwitch;
        document.getElementById('hardwareSwitch').value = modelSettings.hardwareSwitch;

        

  
        document.getElementById('bitSwitch').addEventListener('input', function(event) {
          const bitValue = parseInt(event.target.value);
          document.getElementById('bitMessage').innerText = getBitMessage(bitValue);
        });

        document.getElementById('clearButton').addEventListener('click', async () => {
          await clearModelSettings();
          const modelFileLabel = document.querySelector('label[for="modelFile"]');
          modelFileLabel.textContent = "Select your model's weight file";
          modelFileLabel.classList.remove('selected');
        
          const configFileLabel = document.querySelector('label[for="configFile"]');
          configFileLabel.textContent = "Select your model's config file";
          configFileLabel.classList.remove('selected');
          document.getElementById('modelFile').value = '';
          document.getElementById('configFile').value = '';
        
          modelFilePath = '';
          configFilePath = '';
        
          updateClearButtonState(); 
        });
        
        function getBitMessage(bitValue) {
          switch (bitValue) {
            case 0:
              return "4 bit";
            case 1:
              return "8 bit";
            case 2:
              return "16 bit";
            case 3:
              return "32 bit";
            default:
              return "";
          }
        }
            
  
        document.getElementById('resetButton').addEventListener('click', async () => {
          const defaultSettings = resetModelSettings();
          document.getElementById('modelRepository').value = defaultSettings.modelRepository;
          document.getElementById('bitSwitch').value = defaultSettings.bitSwitch;
          document.getElementById('hardwareSwitch').value = defaultSettings.hardwareSwitch;
        
          await saveModelSettings();
        });
  
        function updateButtonStatus() {
          if (modelSettings.modelPath !== '') {
            const modelFileLabel = document.querySelector('label[for="modelFile"]');
            modelFileLabel.textContent = modelSettings.modelPath;
            modelFileLabel.classList.add('selected');
            updateClearButtonState(); 
  
          }
  
        
          if (modelSettings.modelConfig !== '') {
            const configFileLabel = document.querySelector('label[for="configFile"]');
            configFileLabel.textContent = modelSettings.modelConfig;
            configFileLabel.classList.add('selected');
            updateClearButtonState(); 
  
          }
        }
  
        function updateClearButtonState() {
          const modelFileLabel = document.querySelector('label[for="modelFile"]');
          const configFileLabel = document.querySelector('label[for="configFile"]');
          const clearButton = document.getElementById('clearButton');
        
          if (modelFileLabel.classList.contains('selected') || configFileLabel.classList.contains('selected')) {
            clearButton.classList.add('green');
          } else {
            clearButton.classList.remove('green');
          }
        }
        
        
  
        document.getElementById('applyButton').addEventListener('click', () => {
          saveModelSettings();
          isScriptRunning = false;
          updateSendButtonState();
          toggleStopGenerationButton(false); 
        });
        
  
        document.getElementById('modelFile').addEventListener('change', (event) => {
          modelFilePath = event.target.files[0].path;
          const modelFileLabel = document.querySelector('label[for="modelFile"]');
          modelFileLabel.textContent = modelFilePath;
          modelFileLabel.classList.add('selected');
          updateClearButtonState();
        });
        
        document.getElementById('configFile').addEventListener('change', (event) => {
          configFilePath = event.target.files[0].path;
          const configFileLabel = document.querySelector('label[for="configFile"]');
          configFileLabel.textContent = configFilePath;
          configFileLabel.classList.add('selected');
          updateClearButtonState();
        });        
      });
  }

  function updateMergeModelContent() {
    contentContainer.innerHTML = `<h2>Merge Model</h2><p>Dummy content for Merge Model goes here...</p>`;
    const fs = require('fs');
    const path = require('path');
  }

  function updateCustomizationToolsContent() {

          fs.readFile(path.join(__dirname, '../content/customization-tools.html'), 'utf8', function(err, data) {
        if (err) {
          console.error(err);
          return;
        }
        contentContainer.innerHTML = data;
  
        const uploadButtons = document.querySelectorAll('.upload-button');
        const uploadInputs = document.querySelectorAll('.upload-input');
        const profilePictures = document.querySelectorAll('.profile-picture');
        const applyButton = document.querySelector('.apply-button');
  
        const imageUploaded = [false, false];
  
        uploadButtons.forEach((button, index) => {
          button.addEventListener('click', () => {
            uploadInputs[index].click();
          });
  
          uploadInputs[index].addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                profilePictures[index].src = e.target.result;
                imageUploaded[index] = true;
              };
              reader.readAsDataURL(file);
            }
          });
        });
  
        applyButton.addEventListener('click', () => {
          profilePictures.forEach((picture, index) => {
            if (imageUploaded[index]) {
              const img = new Image();
              img.src = picture.src;
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const pngDataUrl = canvas.toDataURL('../graphics/png');
                const imgData = pngDataUrl.replace(/^data:image\/\w+;base64,/, '');
                const imgName = index === 0 ? 'pfpUser.png' : 'pfpModel.png';
                ipcRenderer.send('save-image', imgName, imgData);
              };
            }
          });
        });
      });
  }
}

handleTabClick('inference');