
    

var pmd = {
    getMessagesFromEmbeddedData: function() {
        try {
            let messages = Qualtrics.SurveyEngine.getEmbeddedData('messages');

            if (Array.isArray(messages)) {
                return messages;
            }

            if (typeof messages === 'string') {
              return JSON.parse(messages);
            }

            return [];
        }
        catch(e) {
            console.log('Unable to get messages from embedded data', { e, 'e://Field/messages':'${e://Field/messages}'}); 

            return [];
        }
    },
    loadingTime: 3000,
    messages: [],
    question: {}
};

pmd.questionInit = function(questionContext) {
  pmd.question = {
    context: questionContext,
    negotiate: false,
    addSelectedChoiceValue: false,
    selectedChoiceLabel: '',
    selectedChoiceRecodeValue: ''
  };
};

pmd.updateSelectedValues = function() {
  let selectedChoices = pmd.question.context.getSelectedChoices();
  console.log({selectedChoices});

  if (selectedChoices.length === 0) {
    pmd.selectedChoiceRecodeValue = '';
    pmd.selectedChoiceLabel = '';
  }

  if (selectedChoices.length > 1) {
    console.log('more than 1 choice selected');
  }

  pmd.question.selectedChoiceLabel = Qualtrics.SurveyEngine.QuestionInfo[pmd.question.context.questionId].Choices[selectedChoices[0]].Text;//document.getElementById(`${pmd.question.context.questionId}-${selectedChoices[0]}-label`).textContent;
  pmd.question.selectedChoiceRecodeValue = pmd.question.context.getChoiceRecodeValue(selectedChoices[0]);
};

pmd.addMessage = function(message) {
    pmd.messages.push(message);
}; 

pmd.saveMessagesToEmbeddedData = function() {
    Qualtrics.SurveyEngine.setEmbeddedData('messages', JSON.stringify(pmd.messages));
};

pmd.addSelectedChoiceValue = function() {
  pmd.addMessage({
    text: pmd.question.selectedChoiceLabel,
    me: true,
    statement: false
  });
};

pmd.hideLoaders = function() {
  let loaders = document.querySelectorAll('.sending-message + .loading');

  loaders.forEach(l => {
    l.style.display = 'none';
  });
};

pmd.showSendingMessages = function() {
  let sendingMessages = document.querySelectorAll('.sending-message');
  
  sendingMessages.forEach(s => {
    s.style.display = 'inline';
  }); 
};

pmd.addMessageToChatList = function(chatList, message, shouldLoad) {
  let li = document.createElement('li');
  let classes = ['message'];
  
  if (message.me) {
    classes.push('me');
  }
  
  if (message.statement) {
    classes.push('statement');
  }
  
  li.className = classes.join(' ');
  
  if (shouldLoad && !message.me) {
    let sendingMessage = document.createElement('span');
    sendingMessage.className = 'sending-message';
    sendingMessage.innerText = message.text;
    sendingMessage.style.display = 'none';
    
    let loading = document.createElement('span');
    loading.className = 'loading';
    loading.style.display = 'inline-block';
    
    li.appendChild(sendingMessage);
    li.appendChild(loading);
  }
  else {
    li.innerText = message.text;
  }
  
  chatList.appendChild(li);
  
  window.setTimeout(() => {
    pmd.hideLoaders();
    pmd.showSendingMessages();
  }, pmd.loadingTime);
};

pmd.messagesToChat = function(chatOrderedList, messages) {
  if (!chatOrderedList) {
    return;
  }

  let fragment = document.createDocumentFragment();
  
  chatOrderedList.className = 'chat-history';
  
  for (let i = 0; i < messages.length; i++) {
    pmd.addMessageToChatList(fragment, messages[i], i + 1 === messages.length);
  }
  
  chatOrderedList.innerHTML = "";
  
  chatOrderedList.appendChild(fragment);
};

pmd.getLastOffer = function() {
  return parseInt(Qualtrics.SurveyEngine.getEmbeddedData("LastOffer"));
  //what if LastOffer is empty?
};

pmd.setLastOffer = function(value) {
  return parseInt(Qualtrics.SurveyEngine.setEmbeddedData("LastOffer", value), 10);
};

pmd.getNextOffer = function(lastOffer) {
  return lastOffer - 2;
};

pmd.negotiate = function() {
  let lastOffer = pmd.getLastOffer();
  let nextOffer = pmd.getNextOffer(lastOffer);

  if (pmd.question.selectedChoiceRecodeValue >= nextOffer) {
    return;
  }



  pmd.addMessage({
    text: `You counter offered $${pmd.question.selectedChoiceRecodeValue}k`,
    me: true,
    statement: true
  });
  pmd.addMessage({
    text: `The candidate has rejected your offer and has countered with $${nextOffer}k`,
    me: false,
    statement: true
  });

  pmd.setLastOffer(nextOffer);
};





Qualtrics.SurveyEngine.addOnload(function()
{
  console.log("headerOnload", {pmd, 'Qualtrics.SurveyEngine.getEmbeddedData(\'messages\');': Qualtrics.SurveyEngine.getEmbeddedData('messages')});
    /*Place your JavaScript here to run when the page loads*/

  pmd.messages = pmd.getMessagesFromEmbeddedData();

  let sendingMessages = document.querySelectorAll('.sending-message');

  let loaders = document.querySelectorAll('.sending-message + .loading');

  sendingMessages.forEach(s => {
    s.style.display = 'none';
  });

  loaders.forEach(l => {
    l.style.display = 'inline-block';
  });

  window.setTimeout(() => {
    sendingMessages.forEach(s => {
      s.style.display = 'inline';
    });

    loaders.forEach(l => {
      l.style.display = 'none';
    });  
  }, pmd.loadingTime);
});

Qualtrics.SurveyEngine.addOnReady(function()
{
  console.log('headerOnReady', {pmd, 'embeddedMessages':'${e://Field/messages}', context: this });
  
  let chatHistory = document.getElementById('chat-history');

  if (chatHistory) {
    let choiceContainer = pmd.question.context.getChoiceContainer();
    choiceContainer.className += " choices-fade";
    pmd.messagesToChat(document.getElementById('chat-history'), pmd.messages);
  }   
});

Qualtrics.SurveyEngine.addOnUnload(function() {
  console.log('headerOnUnload', { pmd });
});

Qualtrics.SurveyEngine.addOnPageSubmit(function(type) {
  console.log('headerOnPageSubmit', {pmd, type});

  if (type !== 'next') {
    console.log('submit is not next');
    pmd.saveMessagesToEmbeddedData();
    return;
  }

  pmd.updateSelectedValues();

  if (pmd.question.addSelectedChoiceValue) {
    pmd.addSelectedChoiceValue();
  }

  if (pmd.question.negotiate) {
    pmd.negotiate();
  }

  pmd.saveMessagesToEmbeddedData();
});
